package com.smartspend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartspend.dto.imports.*;
import com.smartspend.entity.*;
import com.smartspend.entity.BankImport.ImportStatus;
import com.smartspend.entity.BankImportRow.RowStatus;
import com.smartspend.entity.PointEvent.ActionType;
import com.smartspend.entity.Transaction.TransactionSource;
import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BankImportService {

    private final BankImportRepository bankImportRepository;
    private final BankImportRowRepository rowRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final ObjectMapper objectMapper;
    private final GamificationService gamificationService;

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Transactional
    public BankImportPreviewResponse uploadPreview(User user, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }

        ParsedSheet parsedSheet = parseFile(file);
        if (parsedSheet.headers().isEmpty()) {
            throw new IllegalArgumentException("File has no header row");
        }

        BankImport bankImport = BankImport.builder()
                .user(user)
                .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "statement")
                .status(ImportStatus.DRAFT)
                .totalRows(parsedSheet.rows().size())
                .build();

        for (int i = 0; i < parsedSheet.rows().size(); i++) {
            bankImport.getRows().add(BankImportRow.builder()
                    .bankImport(bankImport)
                    .rowIndex(i + 2)
                    .rawDataJson(writeJson(parsedSheet.rows().get(i)))
                    .status(RowStatus.RAW)
                    .build());
        }

        bankImport = bankImportRepository.save(bankImport);
        BankImportMappingRequest mapping = suggestMapping(parsedSheet.headers());
        return buildPreview(bankImport, mapping);
    }

    @Transactional(readOnly = true)
    public BankImportPreviewResponse previewMapping(User user, Long importId, BankImportMappingRequest mapping) {
        BankImport bankImport = getImport(user, importId);
        return buildPreview(bankImport, mapping);
    }

    @Transactional
    public BankImportPreviewResponse confirmImport(User user, Long importId, BankImportConfirmRequest request) {
        BankImport bankImport = getImport(user, importId);
        if (bankImport.getStatus() != ImportStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft imports can be confirmed");
        }

        Wallet wallet = walletRepository.findById(request.getWalletId())
                .filter(w -> w.getUser().getId().equals(user.getId()) && w.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        Set<Long> selectedIds = request.getSelectedRowIds() != null
                ? new HashSet<>(request.getSelectedRowIds())
                : null;
        Map<Long, String> categoryOverrides = request.getCategoryOverrides() != null
                ? request.getCategoryOverrides()
                : Map.of();

        int imported = 0;
        int duplicates = 0;
        int errors = 0;

        List<BankImportRow> rows = rowRepository.findByBankImportIdOrderByRowIndexAsc(bankImport.getId());
        for (BankImportRow row : rows) {
            if (selectedIds != null && !selectedIds.contains(row.getId())) {
                row.setStatus(RowStatus.SKIPPED);
                rowRepository.save(row);
                continue;
            }

            ParsedTransaction parsed = parseRow(readJson(row.getRawDataJson()), request.getMapping());
            applyParsed(row, parsed, categoryOverrides.get(row.getId()));

            if (row.getStatus() == RowStatus.ERROR) {
                errors++;
                rowRepository.save(row);
                continue;
            }

            String hash = duplicateHash(user.getId(), wallet.getId(), row);
            row.setDuplicateHash(hash);
            if (rowRepository.existsImportedHash(user.getId(), hash, RowStatus.IMPORTED)) {
                row.setStatus(RowStatus.DUPLICATE);
                row.setErrorMessage("Duplicate transaction");
                duplicates++;
                rowRepository.save(row);
                continue;
            }

            Category category = findCategory(user, row.getCategoryName());
            Transaction transaction = Transaction.builder()
                    .user(user)
                    .wallet(wallet)
                    .category(category)
                    .amount(row.getAmount())
                    .type(row.getType())
                    .note(row.getDescription())
                    .transactionDate(row.getTransactionDate())
                    .source(TransactionSource.MANUAL)
                    .build();

            if (row.getType() == TransactionType.INCOME) {
                wallet.setBalance(wallet.getBalance().add(row.getAmount()));
            } else if (row.getType() == TransactionType.EXPENSE) {
                wallet.setBalance(wallet.getBalance().subtract(row.getAmount()));
            }

            row.setTransaction(transactionRepository.save(transaction));
            row.setStatus(RowStatus.IMPORTED);
            row.setErrorMessage(null);
            rowRepository.save(row);
            imported++;
        }

        walletRepository.save(wallet);
        bankImport.setWallet(wallet);
        bankImport.setStatus(ImportStatus.IMPORTED);
        bankImport.setImportedAt(LocalDateTime.now());
        bankImport.setImportedRows(imported);
        bankImport.setDuplicateRows(duplicates);
        bankImport.setErrorRows(errors);
        bankImportRepository.save(bankImport);

        if (imported > 0) {
            gamificationService.awardPoints(
                    user,
                    ActionType.BANK_IMPORT_COMPLETED,
                    15 + Math.min(35, imported * 2),
                    "Import sao kê",
                    "Đã import " + imported + " giao dịch từ sao kê",
                    bankImport.getId());
        }

        return buildPreview(bankImport, request.getMapping());
    }

    @Transactional(readOnly = true)
    public List<BankImportHistoryResponse> getHistory(User user) {
        return bankImportRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toHistory)
                .toList();
    }

    @Transactional
    public BankImportHistoryResponse rollback(User user, Long importId) {
        BankImport bankImport = getImport(user, importId);
        if (bankImport.getStatus() != ImportStatus.IMPORTED) {
            throw new IllegalArgumentException("Only imported batches can be rolled back");
        }

        List<BankImportRow> rows = rowRepository.findByBankImportIdOrderByRowIndexAsc(bankImport.getId());
        for (BankImportRow row : rows) {
            Transaction tx = row.getTransaction();
            if (row.getStatus() == RowStatus.IMPORTED && tx != null) {
                Wallet wallet = tx.getWallet();
                if (tx.getType() == TransactionType.INCOME) {
                    wallet.setBalance(wallet.getBalance().subtract(tx.getAmount()));
                } else if (tx.getType() == TransactionType.EXPENSE) {
                    wallet.setBalance(wallet.getBalance().add(tx.getAmount()));
                }
                walletRepository.save(wallet);
                transactionRepository.delete(tx);
                row.setTransaction(null);
                row.setStatus(RowStatus.ROLLED_BACK);
                rowRepository.save(row);
            }
        }

        bankImport.setStatus(ImportStatus.ROLLED_BACK);
        bankImport.setRolledBackAt(LocalDateTime.now());
        bankImportRepository.save(bankImport);
        return toHistory(bankImport);
    }

    private BankImportPreviewResponse buildPreview(BankImport bankImport, BankImportMappingRequest mapping) {
        List<BankImportRow> rows = rowRepository.findByBankImportIdOrderByRowIndexAsc(bankImport.getId());
        List<String> headers = rows.isEmpty()
                ? List.of()
                : new ArrayList<>(readJson(rows.get(0).getRawDataJson()).keySet());

        List<BankImportRowPreviewResponse> previewRows = rows.stream()
                .map(row -> previewRow(row, mapping))
                .toList();

        return BankImportPreviewResponse.builder()
                .importId(bankImport.getId())
                .fileName(bankImport.getFileName())
                .status(bankImport.getStatus())
                .headers(headers)
                .suggestedMapping(mapping)
                .rows(previewRows)
                .totalRows(bankImport.getTotalRows())
                .importedRows(bankImport.getImportedRows())
                .duplicateRows(bankImport.getDuplicateRows())
                .errorRows(bankImport.getErrorRows())
                .build();
    }

    private BankImportRowPreviewResponse previewRow(BankImportRow row, BankImportMappingRequest mapping) {
        Map<String, String> raw = readJson(row.getRawDataJson());
        BankImportRow temp = new BankImportRow();
        ParsedTransaction parsed = parseRow(raw, mapping);
        applyParsed(temp, parsed, null);

        return BankImportRowPreviewResponse.builder()
                .id(row.getId())
                .rowIndex(row.getRowIndex())
                .rawData(raw)
                .transactionDate(temp.getTransactionDate())
                .description(temp.getDescription())
                .amount(temp.getAmount())
                .type(temp.getType())
                .categoryName(temp.getCategoryName())
                .referenceCode(temp.getReferenceCode())
                .status(row.getStatus() == RowStatus.IMPORTED || row.getStatus() == RowStatus.DUPLICATE
                        || row.getStatus() == RowStatus.SKIPPED || row.getStatus() == RowStatus.ROLLED_BACK
                        ? row.getStatus()
                        : temp.getStatus())
                .errorMessage(row.getErrorMessage() != null ? row.getErrorMessage() : temp.getErrorMessage())
                .selected(temp.getStatus() != RowStatus.ERROR)
                .build();
    }

    private void applyParsed(BankImportRow row, ParsedTransaction parsed, String categoryOverride) {
        if (parsed.error() != null) {
            row.setStatus(RowStatus.ERROR);
            row.setErrorMessage(parsed.error());
            return;
        }
        row.setTransactionDate(parsed.date());
        row.setDescription(parsed.description());
        row.setAmount(parsed.amount());
        row.setType(parsed.type());
        row.setCategoryName(categoryOverride != null && !categoryOverride.isBlank()
                ? categoryOverride.trim()
                : predictCategory(parsed.description(), parsed.type()));
        row.setReferenceCode(parsed.reference());
        row.setStatus(RowStatus.READY);
        row.setErrorMessage(null);
    }

    private ParsedTransaction parseRow(Map<String, String> raw, BankImportMappingRequest mapping) {
        if (mapping == null) {
            return ParsedTransaction.error("Mapping is required");
        }

        LocalDate date = parseDate(value(raw, mapping.getDateColumn()));
        if (date == null) {
            return ParsedTransaction.error("Cannot parse date");
        }

        String description = value(raw, mapping.getDescriptionColumn());
        if (description == null || description.isBlank()) {
            description = "Imported bank transaction";
        }

        String reference = value(raw, mapping.getReferenceColumn());
        MoneyAndType moneyAndType = parseMoneyAndType(raw, mapping);
        if (moneyAndType.error() != null) {
            return ParsedTransaction.error(moneyAndType.error());
        }

        return new ParsedTransaction(
                date,
                description.trim(),
                moneyAndType.amount(),
                moneyAndType.type(),
                reference,
                null);
    }

    private MoneyAndType parseMoneyAndType(Map<String, String> raw, BankImportMappingRequest mapping) {
        BigDecimal debit = parseMoney(value(raw, mapping.getDebitColumn()));
        BigDecimal credit = parseMoney(value(raw, mapping.getCreditColumn()));

        if (debit != null && debit.compareTo(ZERO) > 0) {
            return new MoneyAndType(debit.abs(), TransactionType.EXPENSE, null);
        }
        if (credit != null && credit.compareTo(ZERO) > 0) {
            return new MoneyAndType(credit.abs(), TransactionType.INCOME, null);
        }

        BigDecimal amount = parseMoney(value(raw, mapping.getAmountColumn()));
        if (amount == null || amount.compareTo(ZERO) == 0) {
            return MoneyAndType.error("Cannot parse amount");
        }

        TransactionType type = amount.compareTo(ZERO) < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
        String typeText = normalize(value(raw, mapping.getTypeColumn()));
        if (typeText != null) {
            if (containsAny(typeText, "debit", "expense", "withdraw", "out", "ghi no", "phat sinh no", "chi")) {
                type = TransactionType.EXPENSE;
            } else if (containsAny(typeText, "credit", "income", "deposit", "in", "ghi co", "phat sinh co", "thu")) {
                type = TransactionType.INCOME;
            }
        }

        return new MoneyAndType(amount.abs(), type, null);
    }

    private ParsedSheet parseFile(MultipartFile file) {
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase(Locale.ROOT) : "";
        try {
            if (name.endsWith(".csv")) {
                return parseCsv(file);
            }
            if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
                return parseWorkbook(file);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot read statement file: " + e.getMessage());
        }
        throw new IllegalArgumentException("Only CSV, XLSX or XLS files are supported");
    }

    private ParsedSheet parseCsv(MultipartFile file) throws IOException {
        List<String> lines;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            lines = reader.lines().filter(line -> !line.isBlank()).toList();
        }
        if (lines.isEmpty()) return new ParsedSheet(List.of(), List.of());

        char delimiter = detectDelimiter(lines.get(0));
        List<String> headers = parseCsvLine(stripBom(lines.get(0)), delimiter);
        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < lines.size(); i++) {
            List<String> values = parseCsvLine(lines.get(i), delimiter);
            Map<String, String> row = new LinkedHashMap<>();
            for (int c = 0; c < headers.size(); c++) {
                row.put(headers.get(c), c < values.size() ? values.get(c) : "");
            }
            if (row.values().stream().anyMatch(v -> v != null && !v.isBlank())) {
                rows.add(row);
            }
        }
        return new ParsedSheet(headers, rows);
    }

    private ParsedSheet parseWorkbook(MultipartFile file) throws IOException {
        try (InputStream in = file.getInputStream(); Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) return new ParsedSheet(List.of(), List.of());

            List<String> headers = new ArrayList<>();
            for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                String header = formatter.formatCellValue(headerRow.getCell(c)).trim();
                headers.add(header.isBlank() ? "Column " + (c + 1) : header);
            }

            List<Map<String, String>> rows = new ArrayList<>();
            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row excelRow = sheet.getRow(r);
                if (excelRow == null) continue;
                Map<String, String> row = new LinkedHashMap<>();
                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = excelRow.getCell(c);
                    String value;
                    if (cell != null && DateUtil.isCellDateFormatted(cell)) {
                        value = cell.getLocalDateTimeCellValue().toLocalDate().toString();
                    } else {
                        value = formatter.formatCellValue(cell).trim();
                    }
                    row.put(headers.get(c), value);
                }
                if (row.values().stream().anyMatch(v -> v != null && !v.isBlank())) {
                    rows.add(row);
                }
            }
            return new ParsedSheet(headers, rows);
        }
    }

    private BankImportMappingRequest suggestMapping(List<String> headers) {
        BankImportMappingRequest mapping = new BankImportMappingRequest();
        for (String header : headers) {
            String h = normalize(header);
            if (mapping.getDateColumn() == null && containsAny(h, "date", "ngay", "time", "thoi gian")) {
                mapping.setDateColumn(header);
            }
            if (mapping.getDescriptionColumn() == null && containsAny(h, "description", "noi dung", "dien giai", "remark", "memo", "details")) {
                mapping.setDescriptionColumn(header);
            }
            if (mapping.getDebitColumn() == null && containsAny(h, "debit", "ghi no", "phat sinh no", "rut", "chi", "tien ra")) {
                mapping.setDebitColumn(header);
            }
            if (mapping.getCreditColumn() == null && containsAny(h, "credit", "ghi co", "phat sinh co", "thu", "tien vao")) {
                mapping.setCreditColumn(header);
            }
            if (mapping.getAmountColumn() == null && containsAny(h, "amount", "so tien", "transaction amount")) {
                mapping.setAmountColumn(header);
            }
            if (mapping.getTypeColumn() == null && containsAny(h, "type", "loai")) {
                mapping.setTypeColumn(header);
            }
            if (mapping.getReferenceColumn() == null && containsAny(h, "ref", "ma gd", "ma giao dich", "transaction id", "reference")) {
                mapping.setReferenceColumn(header);
            }
            if (mapping.getBalanceColumn() == null && containsAny(h, "balance", "so du")) {
                mapping.setBalanceColumn(header);
            }
        }
        return mapping;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim();
        List<DateTimeFormatter> patterns = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("d/M/yyyy"),
                DateTimeFormatter.ofPattern("d-M-yyyy"),
                DateTimeFormatter.ofPattern("M/d/yyyy"),
                DateTimeFormatter.ofPattern("yyyy/M/d"),
                DateTimeFormatter.ofPattern("yyyy-M-d")
        );
        for (DateTimeFormatter formatter : patterns) {
            try {
                return LocalDate.parse(v, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        if (v.length() >= 10) {
            return parseDate(v.substring(0, 10));
        }
        return null;
    }

    private BigDecimal parseMoney(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim()
                .replace("\u00a0", "")
                .replaceAll("[^0-9,\\.\\-+]", "");
        if (v.isBlank() || v.equals("-") || v.equals("+")) return null;

        boolean negative = v.startsWith("-");
        v = v.replace("+", "").replace("-", "");
        int lastComma = v.lastIndexOf(',');
        int lastDot = v.lastIndexOf('.');
        char decimalSep = 0;
        if (lastComma >= 0 && lastDot >= 0) {
            decimalSep = lastComma > lastDot ? ',' : '.';
        } else if (lastComma >= 0) {
            int after = v.length() - lastComma - 1;
            decimalSep = after <= 2 ? ',' : 0;
        } else if (lastDot >= 0) {
            int after = v.length() - lastDot - 1;
            decimalSep = after <= 2 ? '.' : 0;
        }

        String normalized;
        if (decimalSep == ',') {
            normalized = v.replace(".", "").replace(",", ".");
        } else if (decimalSep == '.') {
            normalized = v.replace(",", "");
        } else {
            normalized = v.replace(",", "").replace(".", "");
        }

        if (normalized.isBlank()) return null;
        BigDecimal amount = new BigDecimal(normalized).setScale(2, RoundingMode.HALF_UP);
        return negative ? amount.negate() : amount;
    }

    private String predictCategory(String description, TransactionType type) {
        if (type == TransactionType.INCOME) {
            return "Thu nhập";
        }
        String d = normalize(description);
        if (containsAny(d, "grab", "be ", "gojek", "taxi", "xang", "bus", "metro")) return "Di chuyển";
        if (containsAny(d, "shopee", "lazada", "tiki", "mall", "store", "shop")) return "Mua sắm";
        if (containsAny(d, "coffee", "cafe", "highlands", "phuc long", "restaurant", "com", "pho", "bun", "food")) return "Ăn uống";
        if (containsAny(d, "netflix", "cinema", "game", "spotify", "movie")) return "Giải trí";
        if (containsAny(d, "salary", "luong", "payroll", "thu nhap")) return "Thu nhập";
        return "Khác";
    }

    private Category findCategory(User user, String categoryName) {
        if (categoryName != null && !categoryName.isBlank()) {
            Optional<Category> category = categoryRepository.findByNameAndUserId(categoryName, user.getId());
            if (category.isPresent()) return category.get();
        }
        return categoryRepository.findByNameAndUserId("Khác", user.getId()).orElse(null);
    }

    private String duplicateHash(Long userId, Long walletId, BankImportRow row) {
        String base = userId + "|" + walletId + "|" + row.getTransactionDate() + "|"
                + row.getType() + "|" + row.getAmount().setScale(2, RoundingMode.HALF_UP) + "|"
                + normalize(row.getDescription()) + "|" + normalize(row.getReferenceCode());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(base.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(base.hashCode());
        }
    }

    private BankImport getImport(User user, Long importId) {
        return bankImportRepository.findByIdAndUserId(importId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Import batch not found"));
    }

    private BankImportHistoryResponse toHistory(BankImport bankImport) {
        return BankImportHistoryResponse.builder()
                .id(bankImport.getId())
                .fileName(bankImport.getFileName())
                .walletName(bankImport.getWallet() != null ? bankImport.getWallet().getName() : null)
                .status(bankImport.getStatus())
                .totalRows(bankImport.getTotalRows())
                .importedRows(bankImport.getImportedRows())
                .duplicateRows(bankImport.getDuplicateRows())
                .errorRows(bankImport.getErrorRows())
                .createdAt(bankImport.getCreatedAt())
                .importedAt(bankImport.getImportedAt())
                .rolledBackAt(bankImport.getRolledBackAt())
                .build();
    }

    private String writeJson(Map<String, String> row) {
        try {
            return objectMapper.writeValueAsString(row);
        } catch (Exception e) {
            throw new IllegalArgumentException("Cannot serialize import row");
        }
    }

    private Map<String, String> readJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, String>>() {});
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private String value(Map<String, String> row, String column) {
        if (column == null || column.isBlank()) return null;
        return row.get(column);
    }

    private char detectDelimiter(String headerLine) {
        long semicolon = headerLine.chars().filter(ch -> ch == ';').count();
        long comma = headerLine.chars().filter(ch -> ch == ',').count();
        long tab = headerLine.chars().filter(ch -> ch == '\t').count();
        if (tab > comma && tab > semicolon) return '\t';
        return semicolon > comma ? ';' : ',';
    }

    private List<String> parseCsvLine(String line, char delimiter) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == delimiter && !inQuotes) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        values.add(current.toString().trim());
        return values;
    }

    private String stripBom(String value) {
        return value != null && value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private String normalize(String value) {
        if (value == null) return null;
        String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccent.toLowerCase(Locale.ROOT).trim();
    }

    private boolean containsAny(String value, String... needles) {
        if (value == null) return false;
        for (String needle : needles) {
            if (value.contains(needle)) return true;
        }
        return false;
    }

    private record ParsedSheet(List<String> headers, List<Map<String, String>> rows) {}
    private record ParsedTransaction(LocalDate date, String description, BigDecimal amount, TransactionType type, String reference, String error) {
        static ParsedTransaction error(String error) {
            return new ParsedTransaction(null, null, null, null, null, error);
        }
    }
    private record MoneyAndType(BigDecimal amount, TransactionType type, String error) {
        static MoneyAndType error(String error) {
            return new MoneyAndType(null, null, error);
        }
    }
}
