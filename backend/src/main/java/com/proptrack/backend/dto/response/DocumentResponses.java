package com.proptrack.backend.dto.response;

import com.proptrack.backend.entity.Document.DocType;

public class DocumentResponses {

    public record DocumentResponse(
            String id,
            String propertyId,
            DocType docType,
            String fileName,
            String storageUrl,
            Long fileSizeBytes,
            String mimeType,
            String aiSummary,
            boolean aiProcessed,
            AuthResponses.UserResponse uploadedBy,
            String createdAt
    ) {}

    public record OcrDocumentDto(
            String possessionDate,
            Double totalConsideration,
            String penaltyPerDay,
            java.util.List<String> paymentMilestones,
            java.util.List<String> builderObligations,
            java.util.List<String> keyClauses,
            String summary
    ) {}
}
