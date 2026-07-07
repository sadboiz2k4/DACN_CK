package com.smartspend.repository;

import com.smartspend.entity.SplitGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SplitGroupMemberRepository extends JpaRepository<SplitGroupMember, Long> {
    List<SplitGroupMember> findByGroupIdAndActiveTrueOrderByCreatedAtAsc(Long groupId);
    Optional<SplitGroupMember> findByIdAndGroupId(Long id, Long groupId);
}
