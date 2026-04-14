package com.proptrack.backend.repository;

import com.proptrack.backend.entity.Document;
import com.proptrack.backend.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByPropertyOrderByCreatedAtDesc(Property property);
    List<Document> findByPropertyAndDocType(Property property, Document.DocType docType);
}