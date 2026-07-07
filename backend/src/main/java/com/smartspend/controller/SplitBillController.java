package com.smartspend.controller;

import com.smartspend.dto.split.*;
import com.smartspend.entity.User;
import com.smartspend.service.SplitBillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SplitBillController {

    private final SplitBillService splitBillService;

    @GetMapping("/split-groups")
    public ResponseEntity<List<SplitGroupResponse>> getGroups(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(splitBillService.getGroups(user));
    }

    @PostMapping("/split-groups")
    public ResponseEntity<SplitGroupResponse> createGroup(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SplitGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(splitBillService.createGroup(user, request));
    }

    @GetMapping("/split-groups/{groupId}")
    public ResponseEntity<SplitGroupResponse> getGroupDetail(
            @AuthenticationPrincipal User user,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(splitBillService.getGroupDetail(user, groupId));
    }

    @PutMapping("/split-groups/{groupId}")
    public ResponseEntity<SplitGroupResponse> updateGroup(
            @AuthenticationPrincipal User user,
            @PathVariable Long groupId,
            @Valid @RequestBody SplitGroupRequest request) {
        return ResponseEntity.ok(splitBillService.updateGroup(user, groupId, request));
    }

    @PostMapping("/split-groups/{groupId}/members")
    public ResponseEntity<SplitGroupResponse> addMember(
            @AuthenticationPrincipal User user,
            @PathVariable Long groupId,
            @Valid @RequestBody SplitMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(splitBillService.addMember(user, groupId, request));
    }

    @PutMapping("/split-groups/{groupId}/members/{memberId}")
    public ResponseEntity<SplitGroupResponse> updateMember(
            @AuthenticationPrincipal User user,
            @PathVariable Long groupId,
            @PathVariable Long memberId,
            @Valid @RequestBody SplitMemberRequest request) {
        return ResponseEntity.ok(splitBillService.updateMember(user, groupId, memberId, request));
    }

    @DeleteMapping("/split-groups/{groupId}/members/{memberId}")
    public ResponseEntity<Void> deleteMember(
            @AuthenticationPrincipal User user,
            @PathVariable Long groupId,
            @PathVariable Long memberId) {
        splitBillService.deleteMember(user, groupId, memberId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/split-groups/{groupId}/bills")
    public ResponseEntity<SplitBillResponse> createBill(
            @AuthenticationPrincipal User user,
            @PathVariable Long groupId,
            @Valid @RequestBody SplitBillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(splitBillService.createBill(user, groupId, request));
    }

    @GetMapping("/split-bills/{billId}")
    public ResponseEntity<SplitBillResponse> getBillDetail(
            @AuthenticationPrincipal User user,
            @PathVariable Long billId) {
        return ResponseEntity.ok(splitBillService.getBillDetail(user, billId));
    }

    @PostMapping("/split-settlements/{settlementId}/mark-paid")
    public ResponseEntity<SplitSettlementResponse> markPaid(
            @AuthenticationPrincipal User user,
            @PathVariable Long settlementId,
            @RequestBody(required = false) SplitSettlementActionRequest request) {
        return ResponseEntity.ok(splitBillService.markPaid(
                user,
                settlementId,
                request != null ? request : new SplitSettlementActionRequest()));
    }

    @PostMapping("/split-settlements/{settlementId}/confirm")
    public ResponseEntity<SplitSettlementResponse> confirmReceived(
            @AuthenticationPrincipal User user,
            @PathVariable Long settlementId,
            @RequestBody(required = false) SplitSettlementActionRequest request) {
        return ResponseEntity.ok(splitBillService.confirmReceived(
                user,
                settlementId,
                request != null ? request : new SplitSettlementActionRequest()));
    }
}
