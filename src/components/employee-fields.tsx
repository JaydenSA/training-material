export function EmployeeFields() {
  return (
    <>
      <label>
        Full name
        <input
          name="name"
          required
          maxLength={80}
          placeholder="e.g. Lerato Ndlovu"
        />
      </label>
      <label>
        Role
        <input name="role" required maxLength={60} placeholder="e.g. Waiter" />
      </label>
      <label>
        Introduction
        <textarea
          name="bio"
          maxLength={240}
          placeholder="A little about this team member"
        />
      </label>
    </>
  );
}
