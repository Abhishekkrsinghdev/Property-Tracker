package com.proptrack.backend.repository;

import com.proptrack.backend.entity.Loan;
import com.proptrack.backend.entity.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LoanRepository extends JpaRepository<Loan, UUID> {
    List<Loan> findByProperty(Property property);
    Optional<Loan> findFirstByPropertyAndStatus(Property property, Loan.LoanStatus status);
}