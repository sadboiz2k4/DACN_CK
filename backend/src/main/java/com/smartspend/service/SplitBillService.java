package com.smartspend.service;

import com.smartspend.dto.split.*;
import com.smartspend.entity.*;
import com.smartspend.entity.SplitBill.BillStatus;
import com.smartspend.entity.PointEvent.ActionType;
import com.smartspend.entity.SplitBill.SplitMode;
import com.smartspend.entity.SplitSettlement.SettlementStatus;
import com.smartspend.entity.Transaction.TransactionSource;
import com.smartspend.entity.Transaction.TransactionType;
import com.smartspend.exception.ResourceNotFoundException;
import com.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SplitBillService {

    private final SplitGroupRepository groupRepository;
    private final SplitGroupMemberRepository memberRepository;
    private final SplitBillRepository billRepository;
    private final SplitSettlementRepository settlementRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final GamificationService gamificationService;

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    @Transactional(readOnly = true)
    public List<SplitGroupResponse> getGroups(User user) {
        return groupRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(group -> toGroupResponse(group, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public SplitGroupResponse getGroupDetail(User user, Long groupId) {
        SplitGroup group = getGroup(user, groupId);
        return toGroupResponse(group, true);
    }

    @Transactional
    public SplitGroupResponse createGroup(User user, SplitGroupRequest request) {
        SplitGroup group = SplitGroup.builder()
                .user(user)
                .name(request.getName().trim())
                .note(blankToNull(request.getNote()))
                .build();
        group = groupRepository.save(group);

        for (SplitMemberRequest memberRequest : request.getMembers()) {
            group.getMembers().add(toMemberEntity(group, memberRequest));
        }

        if (group.getMembers().stream().noneMatch(SplitGroupMember::isCurrentUser)) {
            group.getMembers().add(SplitGroupMember.builder()
                    .group(group)
                    .displayName(user.getFullName())
                    .email(user.getEmail())
                    .currentUser(true)
                    .active(true)
                    .build());
        }

        normalizeCurrentUser(group);
        return toGroupResponse(groupRepository.save(group), true);
    }

    @Transactional
    public SplitGroupResponse updateGroup(User user, Long groupId, SplitGroupRequest request) {
        SplitGroup group = getGroup(user, groupId);
        group.setName(request.getName().trim());
        group.setNote(blankToNull(request.getNote()));
        return toGroupResponse(groupRepository.save(group), true);
    }

    @Transactional
    public SplitGroupResponse addMember(User user, Long groupId, SplitMemberRequest request) {
        SplitGroup group = getGroup(user, groupId);
        SplitGroupMember member = toMemberEntity(group, request);
        group.getMembers().add(member);
        normalizeCurrentUser(group, member.isCurrentUser() ? member : null);
        return toGroupResponse(groupRepository.save(group), true);
    }

    @Transactional
    public SplitGroupResponse updateMember(User user, Long groupId, Long memberId, SplitMemberRequest request) {
        SplitGroup group = getGroup(user, groupId);
        SplitGroupMember member = memberRepository.findByIdAndGroupId(memberId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        member.setDisplayName(request.getDisplayName().trim());
        member.setEmail(blankToNull(request.getEmail()));
        member.setBankCode(normalizeBankCode(request.getBankCode()));
        member.setBankAccountNumber(blankToNull(request.getBankAccountNumber()));
        member.setBankAccountName(blankToNull(request.getBankAccountName()));
        member.setCurrentUser(request.isCurrentUser());
        normalizeCurrentUser(group, member.isCurrentUser() ? member : null);
        memberRepository.save(member);

        return toGroupResponse(group, true);
    }

    @Transactional
    public void deleteMember(User user, Long groupId, Long memberId) {
        getGroup(user, groupId);
        SplitGroupMember member = memberRepository.findByIdAndGroupId(memberId, groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found"));
        member.setActive(false);
        memberRepository.save(member);
    }

    @Transactional
    public SplitBillResponse createBill(User user, Long groupId, SplitBillRequest request) {
        SplitGroup group = getGroup(user, groupId);
        LocalDate billDate = request.getBillDate() != null ? request.getBillDate() : LocalDate.now();
        BigDecimal total = money(request.getTotalAmount());

        List<SplitBillParticipantRequest> includedRequests = request.getParticipants().stream()
                .filter(SplitBillParticipantRequest::isIncluded)
                .toList();
        if (includedRequests.isEmpty()) {
            throw new IllegalArgumentException("Select at least one participant");
        }

        Map<Long, SplitGroupMember> membersById = new HashMap<>();
        for (SplitGroupMember member : group.getMembers()) {
            if (member.isActive()) {
                membersById.put(member.getId(), member);
            }
        }

        List<PreparedParticipant> prepared = prepareParticipants(total, request.getSplitMode(), includedRequests, membersById);
        validatePaidTotal(total, prepared);

        SplitBill bill = SplitBill.builder()
                .group(group)
                .user(user)
                .title(request.getTitle().trim())
                .totalAmount(total)
                .billDate(billDate)
                .note(blankToNull(request.getNote()))
                .splitMode(request.getSplitMode() != null ? request.getSplitMode() : SplitMode.EQUAL)
                .status(BillStatus.OPEN)
                .build();

        bill = billRepository.save(bill);

        List<SplitBillParticipant> participantEntities = new ArrayList<>();
        for (PreparedParticipant p : prepared) {
            SplitBillParticipant participant = SplitBillParticipant.builder()
                    .bill(bill)
                    .member(p.member())
                    .paidAmount(p.paidAmount())
                    .shareAmount(p.shareAmount())
                    .sharePercent(p.sharePercent())
                    .netAmount(p.paidAmount().subtract(p.shareAmount()).setScale(2, RoundingMode.HALF_UP))
                    .build();
            bill.getParticipants().add(participant);
            participantEntities.add(participant);
        }

        createSettlements(bill, participantEntities);
        if (bill.getSettlements().isEmpty()) {
            bill.setStatus(BillStatus.SETTLED);
        }

        BigDecimal currentUserPaid = participantEntities.stream()
                .filter(p -> p.getMember().isCurrentUser())
                .map(SplitBillParticipant::getPaidAmount)
                .reduce(ZERO, BigDecimal::add);
        if (currentUserPaid.compareTo(ZERO) > 0) {
            if (request.getWalletId() == null) {
                throw new IllegalArgumentException("Select a wallet to record your upfront payment");
            }
            bill.setTransaction(createTransaction(
                    user,
                    request.getWalletId(),
                    request.getCategoryId(),
                    currentUserPaid,
                    TransactionType.EXPENSE,
                    "Split bill: " + bill.getTitle(),
                    billDate
            ));
        }

        bill = billRepository.save(bill);
        gamificationService.awardPoints(
                user,
                ActionType.SPLIT_BILL_CREATED,
                10,
                "Tạo bill nhóm",
                "Bạn vừa chia một khoản chi với nhóm",
                bill.getId());
        return toBillResponse(bill);
    }

    @Transactional(readOnly = true)
    public SplitBillResponse getBillDetail(User user, Long billId) {
        SplitBill bill = billRepository.findByIdAndUserId(billId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found"));
        return toBillResponse(bill);
    }

    @Transactional
    public SplitSettlementResponse markPaid(User user, Long settlementId, SplitSettlementActionRequest request) {
        SplitSettlement settlement = getSettlement(user, settlementId);
        if (settlement.getStatus() == SettlementStatus.CONFIRMED) {
            throw new IllegalArgumentException("Settlement is already confirmed");
        }

        if (settlement.getFromMember().isCurrentUser() && settlement.getPaidTransaction() == null) {
            if (request.getWalletId() == null) {
                throw new IllegalArgumentException("Select a wallet to record this payment");
            }
            settlement.setPaidTransaction(createTransaction(
                    user,
                    request.getWalletId(),
                    null,
                    settlement.getAmount(),
                    TransactionType.EXPENSE,
                    "Split bill payment: " + settlement.getBill().getTitle(),
                    LocalDate.now()
            ));
        }

        settlement.setStatus(SettlementStatus.MARKED_AS_PAID);
        settlement.setMarkedPaidAt(LocalDateTime.now());
        settlement.setPaymentNote(blankToNull(request.getNote()));
        return toSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public SplitSettlementResponse confirmReceived(User user, Long settlementId, SplitSettlementActionRequest request) {
        SplitSettlement settlement = getSettlement(user, settlementId);
        if (settlement.getStatus() == SettlementStatus.CONFIRMED) {
            return toSettlementResponse(settlement);
        }

        if (settlement.getToMember().isCurrentUser() && settlement.getReceivedTransaction() == null) {
            if (request.getWalletId() == null) {
                throw new IllegalArgumentException("Select a wallet to record the received reimbursement");
            }
            settlement.setReceivedTransaction(createTransaction(
                    user,
                    request.getWalletId(),
                    null,
                    settlement.getAmount(),
                    TransactionType.INCOME,
                    "Split bill reimbursement: " + settlement.getBill().getTitle(),
                    LocalDate.now()
            ));
        }

        settlement.setStatus(SettlementStatus.CONFIRMED);
        settlement.setConfirmedAt(LocalDateTime.now());
        settlement.setPaymentNote(blankToNull(request.getNote()));
        settlement = settlementRepository.save(settlement);
        boolean settled = updateBillStatus(settlement.getBill());
        if (settled) {
            gamificationService.awardPoints(
                    user,
                    ActionType.SPLIT_BILL_SETTLED,
                    20,
                    "Hoàn tất bill nhóm",
                    "Một bill chia tiền đã được tất toán",
                    settlement.getBill().getId());
        }
        return toSettlementResponse(settlement);
    }

    private List<PreparedParticipant> prepareParticipants(
            BigDecimal total,
            SplitMode splitMode,
            List<SplitBillParticipantRequest> requests,
            Map<Long, SplitGroupMember> membersById) {

        SplitMode mode = splitMode != null ? splitMode : SplitMode.EQUAL;
        List<PreparedParticipant> prepared = new ArrayList<>();

        if (mode == SplitMode.EQUAL) {
            BigDecimal share = total.divide(BigDecimal.valueOf(requests.size()), 2, RoundingMode.DOWN);
            BigDecimal running = ZERO;
            for (int i = 0; i < requests.size(); i++) {
                SplitBillParticipantRequest request = requests.get(i);
                BigDecimal shareAmount = i == requests.size() - 1 ? total.subtract(running) : share;
                running = running.add(shareAmount);
                prepared.add(prepared(request, membersById, shareAmount, null));
            }
            return prepared;
        }

        if (mode == SplitMode.PERCENT) {
            BigDecimal running = ZERO;
            for (int i = 0; i < requests.size(); i++) {
                SplitBillParticipantRequest request = requests.get(i);
                BigDecimal percent = money(request.getSharePercent() != null ? request.getSharePercent() : ZERO);
                if (percent.compareTo(ZERO) < 0) {
                    throw new IllegalArgumentException("Share percent cannot be negative");
                }
                BigDecimal shareAmount = total.multiply(percent)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                if (i == requests.size() - 1) {
                    shareAmount = total.subtract(running);
                }
                running = running.add(shareAmount);
                prepared.add(prepared(request, membersById, shareAmount, percent));
            }
            return prepared;
        }

        for (SplitBillParticipantRequest request : requests) {
            if (request.getShareAmount() == null) {
                throw new IllegalArgumentException("Share amount is required for manual split");
            }
            prepared.add(prepared(request, membersById, request.getShareAmount(), request.getSharePercent()));
        }
        validateShareTotal(total, prepared);
        return prepared;
    }

    private PreparedParticipant prepared(
            SplitBillParticipantRequest request,
            Map<Long, SplitGroupMember> membersById,
            BigDecimal shareAmount,
            BigDecimal sharePercent) {
        SplitGroupMember member = membersById.get(request.getMemberId());
        if (member == null) {
            throw new ResourceNotFoundException("Member not found in this group: " + request.getMemberId());
        }
        BigDecimal paid = money(request.getPaidAmount() != null ? request.getPaidAmount() : ZERO);
        BigDecimal share = money(shareAmount);
        if (paid.compareTo(ZERO) < 0) {
            throw new IllegalArgumentException("Paid amount cannot be negative");
        }
        if (share.compareTo(ZERO) < 0) {
            throw new IllegalArgumentException("Share amount cannot be negative");
        }
        return new PreparedParticipant(
                member,
                paid,
                share,
                sharePercent
        );
    }

    private void validateShareTotal(BigDecimal total, List<PreparedParticipant> prepared) {
        BigDecimal shareTotal = prepared.stream()
                .map(PreparedParticipant::shareAmount)
                .reduce(ZERO, BigDecimal::add);
        if (money(shareTotal).compareTo(total) != 0) {
            throw new IllegalArgumentException("Participant shares must add up to the bill total");
        }
    }

    private void validatePaidTotal(BigDecimal total, List<PreparedParticipant> prepared) {
        validateShareTotal(total, prepared);
        BigDecimal paidTotal = prepared.stream()
                .map(PreparedParticipant::paidAmount)
                .reduce(ZERO, BigDecimal::add);
        if (money(paidTotal).compareTo(total) != 0) {
            throw new IllegalArgumentException("Upfront payments must add up to the bill total");
        }
    }

    private void createSettlements(SplitBill bill, List<SplitBillParticipant> participants) {
        List<BalanceRow> creditors = new ArrayList<>();
        List<BalanceRow> debtors = new ArrayList<>();

        for (SplitBillParticipant participant : participants) {
            BigDecimal net = participant.getNetAmount();
            if (net.compareTo(ZERO) > 0) {
                creditors.add(new BalanceRow(participant.getMember(), net));
            } else if (net.compareTo(ZERO) < 0) {
                debtors.add(new BalanceRow(participant.getMember(), net.abs()));
            }
        }

        int creditorIndex = 0;
        for (BalanceRow debtor : debtors) {
            BigDecimal debtLeft = debtor.amount();
            while (debtLeft.compareTo(ZERO) > 0 && creditorIndex < creditors.size()) {
                BalanceRow creditor = creditors.get(creditorIndex);
                BigDecimal amount = debtLeft.min(creditor.amount());
                bill.getSettlements().add(SplitSettlement.builder()
                        .bill(bill)
                        .fromMember(debtor.member())
                        .toMember(creditor.member())
                        .amount(amount)
                        .status(SettlementStatus.PENDING)
                        .build());

                debtLeft = debtLeft.subtract(amount);
                BigDecimal creditorLeft = creditor.amount().subtract(amount);
                creditors.set(creditorIndex, new BalanceRow(creditor.member(), creditorLeft));
                if (creditorLeft.compareTo(ZERO) == 0) {
                    creditorIndex++;
                }
            }
        }
    }

    private Transaction createTransaction(
            User user,
            Long walletId,
            Long categoryId,
            BigDecimal amount,
            TransactionType type,
            String note,
            LocalDate date) {

        Wallet wallet = walletRepository.findById(walletId)
                .filter(w -> w.getUser().getId().equals(user.getId()) && w.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        Category category = null;
        if (categoryId != null) {
            category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        if (type == TransactionType.EXPENSE) {
            wallet.setBalance(wallet.getBalance().subtract(amount));
        } else if (type == TransactionType.INCOME) {
            wallet.setBalance(wallet.getBalance().add(amount));
        }
        walletRepository.save(wallet);

        return transactionRepository.save(Transaction.builder()
                .user(user)
                .wallet(wallet)
                .category(category)
                .amount(amount)
                .type(type)
                .note(note)
                .transactionDate(date)
                .source(TransactionSource.MANUAL)
                .build());
    }

    private boolean updateBillStatus(SplitBill bill) {
        boolean allConfirmed = bill.getSettlements().stream()
                .allMatch(s -> s.getStatus() == SettlementStatus.CONFIRMED);
        if (allConfirmed && bill.getStatus() != BillStatus.SETTLED) {
            bill.setStatus(BillStatus.SETTLED);
            billRepository.save(bill);
            return true;
        }
        return false;
    }

    private SplitGroup getGroup(User user, Long groupId) {
        return groupRepository.findByIdAndUserId(groupId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Split group not found"));
    }

    private SplitSettlement getSettlement(User user, Long settlementId) {
        return settlementRepository.findByIdAndUserId(settlementId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));
    }

    private SplitGroupMember toMemberEntity(SplitGroup group, SplitMemberRequest request) {
        return SplitGroupMember.builder()
                .group(group)
                .displayName(request.getDisplayName().trim())
                .email(blankToNull(request.getEmail()))
                .bankCode(normalizeBankCode(request.getBankCode()))
                .bankAccountNumber(blankToNull(request.getBankAccountNumber()))
                .bankAccountName(blankToNull(request.getBankAccountName()))
                .currentUser(request.isCurrentUser())
                .active(true)
                .build();
    }

    private void normalizeCurrentUser(SplitGroup group) {
        normalizeCurrentUser(group, null);
    }

    private void normalizeCurrentUser(SplitGroup group, SplitGroupMember preferred) {
        SplitGroupMember selected = preferred != null && preferred.isActive() && preferred.isCurrentUser()
                ? preferred
                : null;

        if (selected == null) {
            selected = group.getMembers().stream()
                    .filter(member -> member.isActive() && member.isCurrentUser())
                    .findFirst()
                    .orElse(null);
        }

        if (selected == null) {
            selected = group.getMembers().stream()
                    .filter(SplitGroupMember::isActive)
                    .findFirst()
                    .orElse(null);
        }

        for (SplitGroupMember member : group.getMembers()) {
            member.setCurrentUser(member.isActive() && member == selected);
        }
    }

    private SplitGroupResponse toGroupResponse(SplitGroup group, boolean includeBills) {
        List<SplitMemberResponse> members = group.getMembers().stream()
                .filter(SplitGroupMember::isActive)
                .map(this::toMemberResponse)
                .toList();

        Optional<SplitGroupMember> currentMember = group.getMembers().stream()
                .filter(SplitGroupMember::isCurrentUser)
                .findFirst();

        BigDecimal toPay = ZERO;
        BigDecimal toReceive = ZERO;
        int openBillCount = 0;
        for (SplitBill bill : group.getBills()) {
            if (bill.getStatus() == BillStatus.OPEN) {
                openBillCount++;
            }
            for (SplitSettlement settlement : bill.getSettlements()) {
                if (settlement.getStatus() == SettlementStatus.CONFIRMED || currentMember.isEmpty()) {
                    continue;
                }
                Long currentId = currentMember.get().getId();
                if (settlement.getFromMember().getId().equals(currentId)) {
                    toPay = toPay.add(settlement.getAmount());
                } else if (settlement.getToMember().getId().equals(currentId)) {
                    toReceive = toReceive.add(settlement.getAmount());
                }
            }
        }

        return SplitGroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .note(group.getNote())
                .members(members)
                .bills(includeBills ? group.getBills().stream().map(this::toBillResponse).toList() : null)
                .amountToPay(money(toPay))
                .amountToReceive(money(toReceive))
                .openBillCount(openBillCount)
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }

    private SplitMemberResponse toMemberResponse(SplitGroupMember member) {
        return SplitMemberResponse.builder()
                .id(member.getId())
                .displayName(member.getDisplayName())
                .email(member.getEmail())
                .bankCode(member.getBankCode())
                .bankAccountNumber(member.getBankAccountNumber())
                .bankAccountName(member.getBankAccountName())
                .currentUser(member.isCurrentUser())
                .active(member.isActive())
                .build();
    }

    private SplitBillResponse toBillResponse(SplitBill bill) {
        return SplitBillResponse.builder()
                .id(bill.getId())
                .groupId(bill.getGroup().getId())
                .groupName(bill.getGroup().getName())
                .title(bill.getTitle())
                .totalAmount(bill.getTotalAmount())
                .billDate(bill.getBillDate())
                .note(bill.getNote())
                .splitMode(bill.getSplitMode())
                .status(bill.getStatus())
                .transactionId(bill.getTransaction() != null ? bill.getTransaction().getId() : null)
                .participants(bill.getParticipants().stream().map(this::toParticipantResponse).toList())
                .settlements(bill.getSettlements().stream().map(this::toSettlementResponse).toList())
                .createdAt(bill.getCreatedAt())
                .updatedAt(bill.getUpdatedAt())
                .build();
    }

    private SplitBillParticipantResponse toParticipantResponse(SplitBillParticipant participant) {
        return SplitBillParticipantResponse.builder()
                .id(participant.getId())
                .memberId(participant.getMember().getId())
                .memberName(participant.getMember().getDisplayName())
                .currentUser(participant.getMember().isCurrentUser())
                .paidAmount(participant.getPaidAmount())
                .shareAmount(participant.getShareAmount())
                .sharePercent(participant.getSharePercent())
                .netAmount(participant.getNetAmount())
                .build();
    }

    private SplitSettlementResponse toSettlementResponse(SplitSettlement settlement) {
        String content = "SPLIT " + settlement.getBill().getId() + " " + settlement.getFromMember().getDisplayName();
        return SplitSettlementResponse.builder()
                .id(settlement.getId())
                .billId(settlement.getBill().getId())
                .fromMemberId(settlement.getFromMember().getId())
                .fromMemberName(settlement.getFromMember().getDisplayName())
                .fromCurrentUser(settlement.getFromMember().isCurrentUser())
                .toMemberId(settlement.getToMember().getId())
                .toMemberName(settlement.getToMember().getDisplayName())
                .toCurrentUser(settlement.getToMember().isCurrentUser())
                .toBankCode(settlement.getToMember().getBankCode())
                .toBankAccountNumber(settlement.getToMember().getBankAccountNumber())
                .toBankAccountName(settlement.getToMember().getBankAccountName())
                .amount(settlement.getAmount())
                .status(settlement.getStatus())
                .paymentContent(content)
                .qrUrl(buildQrUrl(settlement, content))
                .paymentNote(settlement.getPaymentNote())
                .markedPaidAt(settlement.getMarkedPaidAt())
                .confirmedAt(settlement.getConfirmedAt())
                .build();
    }

    private String buildQrUrl(SplitSettlement settlement, String content) {
        SplitGroupMember receiver = settlement.getToMember();
        if (isBlank(receiver.getBankCode()) || isBlank(receiver.getBankAccountNumber())) {
            return null;
        }
        String bankCode = encode(receiver.getBankCode());
        String accountNo = encode(receiver.getBankAccountNumber());
        String addInfo = encode(content);
        String accountName = encode(receiver.getBankAccountName());
        return "https://img.vietqr.io/image/" + bankCode + "-" + accountNo + "-compact.png"
                + "?amount=" + settlement.getAmount().setScale(0, RoundingMode.HALF_UP)
                + "&addInfo=" + addInfo
                + (accountName != null ? "&accountName=" + accountName : "");
    }

    private String encode(String value) {
        if (isBlank(value)) return null;
        return URLEncoder.encode(value.trim(), StandardCharsets.UTF_8);
    }

    private BigDecimal money(BigDecimal value) {
        if (value == null) return ZERO;
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeBankCode(String value) {
        return isBlank(value) ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record PreparedParticipant(
            SplitGroupMember member,
            BigDecimal paidAmount,
            BigDecimal shareAmount,
            BigDecimal sharePercent) {}

    private record BalanceRow(SplitGroupMember member, BigDecimal amount) {}
}
