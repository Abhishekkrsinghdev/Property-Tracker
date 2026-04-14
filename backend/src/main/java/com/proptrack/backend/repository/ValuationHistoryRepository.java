package com.proptrack.backend.repository;

import com.proptrack.backend.entity.Property;
import com.proptrack.backend.entity.ValuationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ValuationHistoryRepository extends JpaRepository<ValuationHistory, UUID> {
    List<ValuationHistory> findByPropertyOrderByValuationDateDesc(Property property);
}