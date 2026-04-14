package com.proptrack.backend.service;

import com.proptrack.backend.dto.response.AuthResponses.UserResponse;
import com.proptrack.backend.dto.response.DocumentResponses.DocumentResponse;
import com.proptrack.backend.dto.response.DocumentResponses.OcrDocumentDto;
import com.proptrack.backend.entity.Document;
import com.proptrack.backend.entity.Property;
import com.proptrack.backend.entity.User;
import com.proptrack.backend.repository.DocumentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final PropertyService propertyService;
    private final StorageService storageService;
    private final RestClient restClient;

    public DocumentService(
            DocumentRepository documentRepository,
            PropertyService propertyService,
            StorageService storageService,
            RestClient.Builder restClientBuilder,
            @Value("${app.ai-service.url}") String aiServiceUrl) {
        this.documentRepository = documentRepository;
        this.propertyService = propertyService;
        this.storageService = storageService;
        this.restClient = restClientBuilder.baseUrl(aiServiceUrl).build();
    }

    @Transactional
    public DocumentResponse uploadDocument(String propertyId, MultipartFile file, String docTypeStr, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);

        Document.DocType docType = Document.DocType.valueOf(docTypeStr);
        String storageUrl = storageService.uploadFile(file, "documents");

        Document document = Document.builder()
                .property(property)
                .docType(docType)
                .fileName(file.getOriginalFilename())
                .storageUrl(storageUrl)
                .fileSizeBytes(file.getSize())
                .mimeType(file.getContentType())
                .uploadedBy(user)
                .aiProcessed(false)
                .build();

        // Attempt OCR Extraction using Claude AI Service
        try {
            OcrDocumentDto ocrResult = restClient.post()
                    .uri("/ocr/document")
                    .body(Map.of(
                            "document_url", storageUrl,
                            "doc_type", docTypeStr
                    ))
                    .retrieve()
                    .body(OcrDocumentDto.class);

            if (ocrResult != null && ocrResult.summary() != null) {
                document.setAiSummary(ocrResult.summary());
                document.setAiProcessed(true);
            }
        } catch (Exception e) {
            // Log it but still save the document
            // We can add retry jobs later if needed
            System.err.println("Document OCR failed: " + e.getMessage());
        }

        documentRepository.save(document);
        return toResponse(document);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocuments(String propertyId, User user) {
        Property property = propertyService.findAccessibleProperty(propertyId, user);
        return documentRepository.findByPropertyOrderByCreatedAtDesc(property)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private DocumentResponse toResponse(Document d) {
        User u = d.getUploadedBy();
        return new DocumentResponse(
                d.getId().toString(),
                d.getProperty().getId().toString(),
                d.getDocType(),
                d.getFileName(),
                d.getStorageUrl(),
                d.getFileSizeBytes(),
                d.getMimeType(),
                d.getAiSummary(),
                d.isAiProcessed(),
                new UserResponse(u.getId().toString(), u.getEmail(), u.getFullName(), u.getRole()),
                d.getCreatedAt() != null ? d.getCreatedAt().toString() : null
        );
    }
}
