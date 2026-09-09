import { useState, useMemo } from "react";
import { fmtMoney, statusMeta } from "../lib/helpers";
import AnalysisView from "./AnalysisView";

export default function DashboardView({ trainings }) {
  const years = useMemo(() => {
    const set = new Set(
      trainings
        .map((t) => t.plan_year)
        .filter(Boolean)
    );

    return [...set].sort((a, b) => b - a);
  }, [trainings]);

  const [selectedYear, setSelectedYear] =
    useState("all");

  const filtered = useMemo(() => {
    if (selectedYear === "all")
      return trainings;

    return trainings.filter(
      (t) =>
        t.plan_year ===
        Number(selectedYear)
    );
  }, [trainings, selectedYear]);

  const total = filtered.length;

  const totalBudget = filtered.reduce(
    (a, t) =>
      a + (Number(t.budget) || 0),
    0
  );

  const totalHours = filtered.reduce(
    (a, t) =>
      a +
      (Number(t.man_hours) || 0),
    0
  );

  const completed = filtered.filter(
    (t) => t.status === "Completed"
  ).length;

  const inProgress = filtered.filter(
    (t) => t.status === "In Progress"
  ).length;

  const completionPct = total
    ? Math.round(
        (completed / total) * 100
      )
    : 0;

  const avgBudget = total
    ? Math.round(totalBudget / total)
    : 0;

  const budgetedCount =
    filtered.filter(
      (t) =>
        t.budget_status ===
        "Büdcələnmiş"
    ).length;

  const outOfBudgetCount =
    filtered.filter(
      (t) =>
        t.budget_status ===
        "Büdcədən kənar"
    ).length;

  const statusCounts = {};

  filtered.forEach((t) => {
    statusCounts[t.status] =
      (statusCounts[t.status] || 0) +
      1;
  });

  const statusRows =
    Object.entries(statusCounts).sort(
      (a, b) => b[1] - a[1]
    );

  const maxStatus = Math.max(
    ...statusRows.map((r) => r[1]),
    1
  );

  const deptCounts = {};

  filtered.forEach((t) => {
    deptCounts[t.dept] =
      (deptCounts[t.dept] || 0) + 1;
  });

  const deptRows =
    Object.entries(deptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

  const maxDept = Math.max(
    ...deptRows.map((r) => r[1]),
    1
  );

  const deptColors = [
    "#0f766e",
    "#7c3aed",
    "#c026d3",
    "#0891b2",
    "#65a30d",
    "#b45309",
    "#334155",
    "#0369a1",
    "#dc2626",
    "#0b2545",
  ];

  const vendorCounts = {};

  filtered.forEach((t) => {
    if (!t.vendor) return;

    vendorCounts[t.vendor] =
      (vendorCounts[t.vendor] || 0) +
      1;
  });

  const topVendor =
    Object.entries(vendorCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "—";

  const skillCounts = {};

  filtered.forEach((t) => {
    if (!t.skill) return;

    skillCounts[t.skill] =
      (skillCounts[t.skill] || 0) + 1;
  });

  const topSkill =
    Object.entries(skillCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "—";

  return (
    <div>
      <div className="hero">
        <h1>
          Təlim Tracker Platforması
        </h1>

        <p>
          Şirkətinizin təlim
          ehtiyacları üzrə executive
          dashboard və analitika.
        </p>
      </div>

      <div className="page">
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#0b2545",
            }}
          >
            Executive Dashboard
          </div>

          <div>
            <div className="filter-label">
              İl
            </div>

            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  e.target.value
                )
              }
              style={{
                minWidth: 140,
              }}
            >
              <option value="all">
                Bütün illər
              </option>

              {years.map((y) => (
                <option
                  key={y}
                  value={y}
                >
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="card">
            <div className="kpi-label">
              Ümumi Təlim
            </div>

            <div className="kpi-value">
              {total}
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Ümumi Büdcə
            </div>

            <div className="kpi-value">
              {fmtMoney(totalBudget)}
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Learning Hours
            </div>

            <div
              className="kpi-value"
              style={{
                color: "#7c3aed",
              }}
            >
              {totalHours}
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Ortalama Büdcə
            </div>

            <div
              className="kpi-value"
              style={{
                color: "#ea580c",
              }}
            >
              {fmtMoney(avgBudget)}
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Tamamlanma
            </div>

            <div
              className="kpi-value"
              style={{
                color: "#059669",
              }}
            >
              {completionPct}%
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Davam Edən
            </div>

            <div
              className="kpi-value"
              style={{
                color: "#2563eb",
              }}
            >
              {inProgress}
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Büdcələnmiş
            </div>

            <div
              className="kpi-value"
              style={{
                color: "#059669",
              }}
            >
              {budgetedCount}
            </div>
          </div>

          <div className="card">
            <div className="kpi-label">
              Büdcədən Kənar
            </div>

            <div
              className="kpi-value"
              style={{
                color: "#dc2626",
              }}
            >
              {outOfBudgetCount}
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginTop: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 15,
            }}
          >
            Executive Summary
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(240px,1fr))",
              gap: 16,
            }}
          >
            <div>
              <strong>
                Top Vendor
              </strong>

              <div>
                {topVendor}
              </div>
            </div>

            <div>
              <strong>
                Top Skill
              </strong>

              <div>
                {topSkill}
              </div>
            </div>

            <div>
              <strong>
                Learning Hours
              </strong>

              <div>
                {totalHours}
              </div>
            </div>

            <div>
              <strong>
                Completion Rate
              </strong>

              <div>
                {completionPct}%
              </div>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="card">
            <div
              style={{
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              Status üzrə bölgü
            </div>

            {statusRows.map(
              ([st, count]) => {
                const meta =
                  statusMeta(st);

                return (
                  <div
                    className="bar-row"
                    key={st}
                  >
                    <div className="bar-label">
                      {meta.label}
                    </div>

                    <div 
