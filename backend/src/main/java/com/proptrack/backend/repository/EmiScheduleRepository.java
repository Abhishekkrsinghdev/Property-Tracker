package com.proptrack.backend.repository;

import com.proptrack.backend.entity.EmiSchedule;
import com.proptrack.backend.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmiScheduleRepository extends JpaRepository<EmiSchedule, UUID> {

    List<EmiSchedule> findByLoanOrderByEmiNumberAsc(Loan loan);

    List<EmiSchedule> findByLoanAndStatus(Loan loan, EmiSchedule.EmiStatus status);

    @Query("SELECT e FROM EmiSchedule e WHERE e.status = 'PENDING' AND e.dueDate BETWEEN :from AND :to")
    List<EmiSchedule> findUpcomingEmis(LocalDate from, LocalDate to);

    @Query("SELECT e FROM EmiSchedule e WHERE e.status = 'PENDING' AND e.dueDate < :today")
    List<EmiSchedule> findOverdueEmis(LocalDate today);

    long countByLoanAndStatus(Loan loan, EmiSchedule.EmiStatus status);
}