package com.smartspend.service;

import com.smartspend.dto.gamification.*;
import com.smartspend.entity.*;
import com.smartspend.entity.PointEvent.ActionType;
import com.smartspend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GamificationService {

    private final GamificationProfileRepository profileRepository;
    private final PointEventRepository pointEventRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;

    private static final List<BadgeDefinition> BADGES = List.of(
            new BadgeDefinition("FIRST_TX", "Bước đầu kỷ luật", "Tạo giao dịch đầu tiên", "receipt", 20,
                    stats -> stats.transactionCount >= 1),
            new BadgeDefinition("TX_10", "Vào guồng ghi chép", "Tạo 10 giao dịch", "clipboard-list", 35,
                    stats -> stats.transactionCount >= 10),
            new BadgeDefinition("TX_30", "Ghi chép đều tay", "Tạo 30 giao dịch", "list-checks", 60,
                    stats -> stats.transactionCount >= 30),
            new BadgeDefinition("TX_100", "Sổ chi tiêu sống động", "Tạo 100 giao dịch", "notebook-tabs", 120,
                    stats -> stats.transactionCount >= 100),
            new BadgeDefinition("STREAK_7", "Chuỗi 7 ngày", "Hoạt động 7 ngày liên tiếp", "flame", 70,
                    stats -> stats.currentStreak >= 7),
            new BadgeDefinition("STREAK_14", "Hai tuần bền bỉ", "Hoạt động 14 ngày liên tiếp", "calendar-check", 100,
                    stats -> stats.currentStreak >= 14),
            new BadgeDefinition("STREAK_30", "Thói quen tháng", "Hoạt động 30 ngày liên tiếp", "sparkles", 180,
                    stats -> stats.currentStreak >= 30),
            new BadgeDefinition("WALLET_MASTER", "Bậc thầy ví tiền", "Tạo ít nhất 3 ví", "wallet", 50,
                    stats -> stats.walletCount >= 3),
            new BadgeDefinition("WALLET_COLLECTOR", "Quản lý nhiều nguồn tiền", "Tạo ít nhất 5 ví", "wallet-cards", 90,
                    stats -> stats.walletCount >= 5),
            new BadgeDefinition("BUDGET_STARTER", "Biết đặt giới hạn", "Tạo ngân sách đầu tiên", "piggy-bank", 40,
                    stats -> stats.budgetEvents >= 1),
            new BadgeDefinition("BUDGET_PLANNER", "Người lập kế hoạch", "Tạo 3 ngân sách", "target", 80,
                    stats -> stats.budgetEvents >= 3),
            new BadgeDefinition("IMPORTER", "Chuyên gia sao kê", "Import sao kê đầu tiên", "file-spreadsheet", 50,
                    stats -> stats.importEvents >= 1),
            new BadgeDefinition("IMPORT_5", "Dọn sao kê chăm chỉ", "Import 5 file sao kê", "folder-check", 100,
                    stats -> stats.importEvents >= 5),
            new BadgeDefinition("SPLIT_STARTER", "Người chia bill", "Tạo bill chia tiền đầu tiên", "users", 40,
                    stats -> stats.splitBillEvents >= 1),
            new BadgeDefinition("SPLIT_5", "Đi chơi có tổ chức", "Tạo 5 bill chia tiền", "users-round", 90,
                    stats -> stats.splitBillEvents >= 5),
            new BadgeDefinition("SETTLEMENT_PRO", "Chốt kèo gọn gàng", "Hoàn tất một bill chia tiền", "check-circle", 60,
                    stats -> stats.splitSettledEvents >= 1),
            new BadgeDefinition("SETTLEMENT_5", "Không để nợ dây dưa", "Hoàn tất 5 bill chia tiền", "badge-check", 120,
                    stats -> stats.splitSettledEvents >= 5)
    );

    @Transactional
    public void awardPoints(User user, ActionType action, int points, String title, String description, Long referenceId) {
        if (user == null || points <= 0) return;

        GamificationProfile profile = getOrCreateProfile(user);
        updateStreak(profile);
        profile.setTotalPoints(profile.getTotalPoints() + points);
        profile.setLevel(levelForPoints(profile.getTotalPoints()));
        profileRepository.save(profile);

        pointEventRepository.save(PointEvent.builder()
                .user(user)
                .action(action)
                .points(points)
                .title(title)
                .description(description)
                .referenceId(referenceId)
                .build());

        evaluateBadges(user, profile);
    }

    @Transactional
    public GamificationDashboardResponse getDashboard(User user) {
        GamificationProfile profile = getOrCreateProfile(user);
        List<UserBadge> earnedBadges = userBadgeRepository.findByUserIdOrderByEarnedAtDesc(user.getId());
        Map<String, UserBadge> earnedByCode = earnedBadges.stream()
                .collect(Collectors.toMap(UserBadge::getBadgeCode, badge -> badge, (a, b) -> a));

        return GamificationDashboardResponse.builder()
                .profile(toProfileResponse(profile))
                .badges(BADGES.stream().map(def -> toBadgeResponse(def, earnedByCode.get(def.code()))).toList())
                .missions(buildMissions(user))
                .recentEvents(pointEventRepository.findTop20ByUserIdOrderByCreatedAtDesc(user.getId())
                        .stream().map(this::toEventResponse).toList())
                .build();
    }

    @Transactional
    public GamificationDashboardResponse refresh(User user) {
        GamificationProfile profile = getOrCreateProfile(user);
        evaluateBadges(user, profile);
        return getDashboard(user);
    }

    private void evaluateBadges(User user, GamificationProfile profile) {
        BadgeStats stats = new BadgeStats(
                transactionRepository.countByUserId(user.getId()),
                walletRepository.countByUserId(user.getId()),
                profile.getCurrentStreak(),
                pointEventRepository.countByUserIdAndAction(user.getId(), ActionType.BUDGET_CREATED),
                pointEventRepository.countByUserIdAndAction(user.getId(), ActionType.BANK_IMPORT_COMPLETED),
                pointEventRepository.countByUserIdAndAction(user.getId(), ActionType.SPLIT_BILL_CREATED),
                pointEventRepository.countByUserIdAndAction(user.getId(), ActionType.SPLIT_BILL_SETTLED));

        for (BadgeDefinition badge : BADGES) {
            if (badge.predicate().test(stats)
                    && !userBadgeRepository.existsByUserIdAndBadgeCode(user.getId(), badge.code())) {
                userBadgeRepository.save(UserBadge.builder()
                        .user(user)
                        .badgeCode(badge.code())
                        .name(badge.name())
                        .description(badge.description())
                        .icon(badge.icon())
                        .bonusPoints(badge.bonusPoints())
                        .build());

                profile.setTotalPoints(profile.getTotalPoints() + badge.bonusPoints());
                profile.setLevel(levelForPoints(profile.getTotalPoints()));
                profileRepository.save(profile);

                pointEventRepository.save(PointEvent.builder()
                        .user(user)
                        .action(ActionType.BADGE_UNLOCKED)
                        .points(badge.bonusPoints())
                        .title("Mở khóa huy hiệu: " + badge.name())
                        .description(badge.description())
                        .build());
            }
        }
    }

    private List<MissionResponse> buildMissions(User user) {
        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.plusDays(1).atStartOfDay();
        LocalDateTime weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1L).atStartOfDay();
        LocalDateTime weekEnd = weekStart.plusDays(7);

        int txToday = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.TRANSACTION_CREATED, dayStart, dayEnd);
        int budgetToday = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.BUDGET_CREATED, dayStart, dayEnd);
        int importToday = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.BANK_IMPORT_COMPLETED, dayStart, dayEnd);
        int splitCreatedToday = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.SPLIT_BILL_CREATED, dayStart, dayEnd);
        int splitSettledToday = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.SPLIT_BILL_SETTLED, dayStart, dayEnd);
        int txWeek = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.TRANSACTION_CREATED, weekStart, weekEnd);
        int importWeek = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.BANK_IMPORT_COMPLETED, weekStart, weekEnd);
        int splitWeek = (int) pointEventRepository.countByUserIdAndActionAndCreatedAtBetween(
                user.getId(), ActionType.SPLIT_BILL_SETTLED, weekStart, weekEnd);
        int dailyActivity = txToday + budgetToday + importToday + splitCreatedToday + splitSettledToday;

        return List.of(
                mission("DAILY_TX", "Ghi 1 giao dịch hôm nay", "Giữ thói quen cập nhật chi tiêu", txToday, 1, 10),
                mission("DAILY_ACTIVITY", "Làm 2 việc tài chính hôm nay", "Ghi giao dịch, tạo ngân sách, import sao kê hoặc xử lý bill nhóm", dailyActivity, 2, 20),
                mission("WEEKLY_TX", "5 giao dịch trong tuần", "Ghi lại ít nhất 5 giao dịch", txWeek, 5, 40),
                mission("WEEKLY_IMPORT", "Import sao kê tuần này", "Đưa sao kê ngân hàng vào app", importWeek, 1, 50),
                mission("WEEKLY_SPLIT", "Hoàn tất 1 bill nhóm", "Chốt xong một khoản chia tiền", splitWeek, 1, 50)
        );
    }

    private MissionResponse mission(String code, String title, String desc, int progress, int target, int reward) {
        return MissionResponse.builder()
                .code(code)
                .title(title)
                .description(desc)
                .progress(Math.min(progress, target))
                .target(target)
                .rewardPoints(reward)
                .completed(progress >= target)
                .build();
    }

    private GamificationProfile getOrCreateProfile(User user) {
        return profileRepository.findByUserId(user.getId()).orElseGet(() ->
                profileRepository.save(GamificationProfile.builder()
                        .user(user)
                        .totalPoints(0)
                        .level(1)
                        .currentStreak(0)
                        .bestStreak(0)
                        .build()));
    }

    private void updateStreak(GamificationProfile profile) {
        LocalDate today = LocalDate.now();
        LocalDate last = profile.getLastActivityDate();
        if (today.equals(last)) {
            return;
        }
        if (last != null && last.plusDays(1).equals(today)) {
            profile.setCurrentStreak(profile.getCurrentStreak() + 1);
        } else {
            profile.setCurrentStreak(1);
        }
        profile.setBestStreak(Math.max(profile.getBestStreak(), profile.getCurrentStreak()));
        profile.setLastActivityDate(today);
    }

    private int levelForPoints(int points) {
        return Math.max(1, (int) Math.floor(Math.sqrt(points / 100.0)) + 1);
    }

    private int pointsForLevel(int level) {
        int normalized = Math.max(1, level) - 1;
        return normalized * normalized * 100;
    }

    private GamificationProfileResponse toProfileResponse(GamificationProfile profile) {
        int current = pointsForLevel(profile.getLevel());
        int next = pointsForLevel(profile.getLevel() + 1);
        int progress = next > current
                ? (int) Math.min(100, Math.round((profile.getTotalPoints() - current) * 100.0 / (next - current)))
                : 100;
        return GamificationProfileResponse.builder()
                .totalPoints(profile.getTotalPoints())
                .level(profile.getLevel())
                .pointsForCurrentLevel(current)
                .pointsForNextLevel(next)
                .levelProgress(progress)
                .currentStreak(profile.getCurrentStreak())
                .bestStreak(profile.getBestStreak())
                .lastActivityDate(profile.getLastActivityDate())
                .build();
    }

    private PointEventResponse toEventResponse(PointEvent event) {
        return PointEventResponse.builder()
                .id(event.getId())
                .action(event.getAction())
                .points(event.getPoints())
                .title(event.getTitle())
                .description(event.getDescription())
                .createdAt(event.getCreatedAt())
                .build();
    }

    private BadgeResponse toBadgeResponse(BadgeDefinition def, UserBadge earned) {
        return BadgeResponse.builder()
                .code(def.code())
                .name(def.name())
                .description(def.description())
                .icon(def.icon())
                .bonusPoints(def.bonusPoints())
                .earned(earned != null)
                .earnedAt(earned != null ? earned.getEarnedAt() : null)
                .build();
    }

    private record BadgeDefinition(
            String code,
            String name,
            String description,
            String icon,
            int bonusPoints,
            Predicate<BadgeStats> predicate) {}

    private record BadgeStats(
            long transactionCount,
            long walletCount,
            int currentStreak,
            long budgetEvents,
            long importEvents,
            long splitBillEvents,
            long splitSettledEvents) {}
}
