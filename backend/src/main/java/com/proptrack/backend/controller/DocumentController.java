package com.proptrack.backend.controller;

import com.proptrack.backend.dto.response.DocumentResponses.DocumentResponse;
import com.proptrack.backend.security.UserPrincipal;
import com.proptrack.backend.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/properties/{propertyId}/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final CurrentUserResolver currentUser;

    @PostMapping
    public ResponseEntity<DocumentResponse> upload(
            @PathVariable String propertyId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") String docType,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.uploadDocument(propertyId, file, docType, currentUser.resolve(principal)));
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getAll(
            @PathVariable String propertyId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                documentService.getDocuments(propertyId, currentUser.resolve(principal))
        );
    }
}
