import { useEffect, useState } from "react";
import "./App.css";

const emptyForm = {
  company: "",
  role: "",
  jobType: "Full-time",
  appliedDate: "",
  salary: "",
  notes: "",
};

const nextStatuses = {
  Applied: ["Interview", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Accepted", "Declined"],
  Rejected: [],
  Accepted: [],
  Declined: [],
};

function App() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");

  async function loadApplications() {
    try {
      const params = new URLSearchParams();
if (search) params.set("company", search);
if (statusFilter) params.set("status", statusFilter);

const response = await fetch(`/api/applications?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setApplications(result.data);
    } catch (error) {
      setMessage(error.message || "Could not load applications.");
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }
function startEdit(application) {
  setEditingId(application._id);
  setForm({
    company: application.company,
    role: application.role,
    jobType: application.jobType,
    appliedDate: application.appliedDate.slice(0, 10),
    salary: application.salary ?? "",
    notes: application.notes || "",
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const now = new Date();
    const today = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    if (form.appliedDate > today) {
      setMessage("Applied date cannot be in the future.");
      return;
    }

    try {
     const response = await fetch(
  editingId ? `/api/applications/${editingId}` : "/api/applications",
  {
    method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setForm(emptyForm);
      setEditingId(null);
      setMessage("Application added!");
      await loadApplications();
    } catch (error) {
      setMessage(error.message || "Could not add application.");
    }
  }

  async function changeStatus(id, status) {
    if (!status) return;

    try {
      const response = await fetch(`/api/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage("Status updated!");
      await loadApplications();
    } catch (error) {
      setMessage(error.message || "Could not update status.");
    }
  }

  async function deleteApplication(id) {
    if (!window.confirm("Delete this application?")) return;

    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage("Application deleted.");
      await loadApplications();
    } catch (error) {
      setMessage(error.message || "Could not delete application.");
    }
  }

  return (
    <main>
      <h1>Job Application Tracker</h1>

      <h2>Add application</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Company name
          <input name="company" value={form.company} onChange={handleChange} required />
        </label>

        <label>
          Job role
          <input name="role" value={form.role} onChange={handleChange} required />
        </label>

        <label>
          Job type
          <select name="jobType" value={form.jobType} onChange={handleChange}>
            <option>Full-time</option>
            <option>Internship</option>
            <option>Contract</option>
          </select>
        </label>

        <label>
          Applied date
        <input type="date" name="appliedDate" value={form.appliedDate} onChange={handleChange} disabled={!!editingId} required />
        </label>

        <label>
          Expected salary (optional)
          <input type="number" name="salary" value={form.salary} onChange={handleChange} min="0" />
        </label>

        <label>
          Notes (optional)
          <textarea name="notes" value={form.notes} onChange={handleChange} />
        </label>

        <button type="submit">Add application</button>
      </form>

      {message && <p role="status">{message}</p>}
<div>
  {Object.keys(nextStatuses).map((status) => (
    <span key={status} style={{ marginRight: "12px" }}>
      {status}: {applications.filter((item) => item.status === status).length}
    </span>
  ))}
</div>
      <h2>Applications</h2>
      <form onSubmit={(event) => {
  event.preventDefault();
  loadApplications();
}}>
  <input
    placeholder="Search by company"
    value={search}
    onChange={(event) => setSearch(event.target.value)}
  />

  <select
    value={statusFilter}
    onChange={(event) => setStatusFilter(event.target.value)}
    aria-label="Filter by status"
  >
    <option value="">All statuses</option>
    {Object.keys(nextStatuses).map((status) => (
      <option key={status} value={status}>{status}</option>
    ))}
  </select>

  <button type="submit">Search</button>
</form>
      {applications.length === 0 && <p>No applications yet.</p>}

      {applications.map((application) => (
        <article key={application._id}>
          <h3>{application.company} — {application.role}</h3>
          <p>ID: {application.applicationId}</p>
          <p>Status: {application.status}</p>
          {application.isOverdue && (
  <strong style={{ color: "red" }}>Follow-up Overdue</strong>
)}

          {nextStatuses[application.status]?.length > 0 && (
            <select
              value=""
              onChange={(event) => changeStatus(application._id, event.target.value)}
              aria-label="Change status"
            >
              <option value="">Change status</option>
              {nextStatuses[application.status].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          )}

          <p>Applied: {application.appliedDate.slice(0, 10)}</p>
          <h4>Status history</h4>
<ul>
  {application.history.map((entry, index) => (
    <li key={index}>
      {entry.status} — {new Date(entry.date).toLocaleString()}
    </li>
  ))}
</ul>
<button type="button" onClick={() => startEdit(application)}>
  Edit
</button>
          <button
            type="button"
            disabled={["Interview", "Offer"].includes(application.status)}
            onClick={() => deleteApplication(application._id)}
          >
            Delete
          </button>
        </article>
      ))}
    </main>
  );
}

export default App;