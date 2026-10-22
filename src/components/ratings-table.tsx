"use client";
import { useState } from "react";
import { useDemo } from "./demo-provider";
import { useSimulatedReviews } from "./simulated-reviews";
import { Badge, Heading } from "./ui";

export function RatingsTable() {
  const { state, mode } = useDemo();
  const simulations = useSimulatedReviews(state.restaurant.slug, state.employees, mode === "database");
  const [employee, setEmployee] = useState("");
  const [stars, setStars] = useState("");
  const [written, setWritten] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [search, setSearch] = useState("");
  const rows = [
    ...state.tips.filter(tip => tip.status === "paid" && tip.rating).map(tip => ({ ...tip, source: mode === "database" ? "Verified" : "Demo" })),
    ...simulations.map(tip => ({ ...tip, source: "Simulated" })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = rows.filter(tip => {
    const date = new Date(tip.createdAt).toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
    const name = state.employees.find(person => person.id === tip.employeeId)?.name || "Archived employee";
    return (!employee || tip.employeeId === employee) && (!stars || tip.rating === Number(stars)) &&
      (!written || (written === "yes" ? !!tip.review?.trim() : !tip.review?.trim())) &&
      (!source || tip.source === source) && (!from || date >= from) && (!until || date <= until) &&
      `${name} ${tip.review || ""}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const invalidDates = !!from && !!until && from > until;
  function clear() { setEmployee(""); setStars(""); setWritten(""); setSource(""); setFrom(""); setUntil(""); setSearch(""); }
  return (
    <>
      <Heading title="Ratings & reviews">Every submitted star rating and written review, organised by employee.</Heading>
      <section className="panel">
        <div className="ratings-filters">
          <label>Search reviews<input type="search" placeholder="Employee name or review text" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <label>Employee<select value={employee} onChange={event => setEmployee(event.target.value)}><option value="">All employees</option>{state.employees.map(person => <option key={person.id} value={person.id}>{person.name}{person.deletedAt ? " (archived)" : ""}</option>)}</select></label>
          <label>Star rating<select value={stars} onChange={event => setStars(event.target.value)}><option value="">All ratings</option>{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} {value === 1 ? "star" : "stars"}</option>)}</select></label>
          <label>Written review<select value={written} onChange={event => setWritten(event.target.value)}><option value="">All submissions</option><option value="yes">With a written review</option><option value="no">Stars only</option></select></label>
          {mode === "database" && <label>Source<select value={source} onChange={event => setSource(event.target.value)}><option value="">All sources</option><option>Verified</option><option>Simulated</option></select></label>}
          <label>From date<input type="date" value={from} max={until || undefined} onChange={event => setFrom(event.target.value)} /></label>
          <label>To date<input type="date" value={until} min={from || undefined} onChange={event => setUntil(event.target.value)} /></label>
          <button className="button secondary" onClick={clear}>Clear filters</button>
        </div>
        {invalidDates && <p className="ratings-caption" role="alert">Choose a start date on or before the end date.</p>}
        <p className="ratings-caption" role="status">Showing {filtered.length} of {rows.length} ratings · Newest first</p>
        <div className="table-scroll">
          <table className="ratings-table" aria-label="Ratings and reviews">
            <thead><tr><th scope="col">Employee</th><th scope="col">Rating</th><th scope="col">Written review</th><th scope="col">Date</th><th scope="col">Source</th></tr></thead>
            <tbody>{filtered.map(tip => <tr key={`${tip.source}:${tip.id}`}>
              <td><strong>{state.employees.find(person => person.id === tip.employeeId)?.name || "Archived employee"}</strong></td>
              <td><span className="review-stars" aria-label={`${tip.rating} out of 5 stars`}>{"★".repeat(tip.rating!)}{"☆".repeat(5 - tip.rating!)}</span><small> {tip.rating}/5</small></td>
              <td className="review-text">{tip.review?.trim() || <span className="muted">No written review</span>}</td>
              <td><time dateTime={tip.createdAt}>{new Date(tip.createdAt).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg" })}</time></td>
              <td><Badge muted={tip.source !== "Verified"}>{tip.source}</Badge></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!filtered.length && <div className="empty">{rows.length ? "No ratings match your filters." : "No ratings yet. Submitted ratings will appear here."}</div>}
      </section>
      {mode === "database" && <p>Simulated reviews are saved in this browser only and do not affect verified ratings or restaurant statistics.</p>}
    </>
  );
}
