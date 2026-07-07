package com.smartspend.repository;

import com.smartspend.entity.GamificationProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GamificationProfileRepository extends JpaRepository<GamificationProfile, Long> {
    Optional<GamificationProfile> findByUserId(Long userId);
}
