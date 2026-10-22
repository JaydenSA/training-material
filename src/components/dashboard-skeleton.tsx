function Bone({ kind = "line" }: { kind?: string }) {
  return <div className={`skeleton-bone skeleton-${kind}`} />;
}

function Card({ image = false }: { image?: boolean }) {
  return (
    <div className="panel pad skeleton-card">
      <Bone kind={image ? "image" : "avatar"} />
      <Bone kind="title" /><Bone /><Bone kind="short" />
      <div className="skeleton-divider" /><Bone kind="button" />
    </div>
  );
}

function Table() {
  return (
    <div className="panel pad">
      <Bone kind="title" />
      {Array.from({ length: 6 }, (_, row) => (
        <div className="skeleton-row" key={row}>
          <Bone /><Bone /><Bone kind="short" /><Bone kind="short" />
        </div>
      ))}
    </div>
  );
}

function Form() {
  return (
    <div className="panel pad">
      <Bone kind="title" />
      {Array.from({ length: 4 }, (_, i) => (
        <div className="skeleton-field" key={i}><Bone kind="short" /><Bone kind="input" /></div>
      ))}
      <Bone kind="button" />
    </div>
  );
}

export function DashboardSkeleton({ section, detail = false }: { section: string; detail?: boolean }) {
  return (
    <div className="dashboard-skeleton" role="status" aria-label="Loading dashboard content">
      <div aria-hidden="true">
        <div className="skeleton-heading"><Bone kind="heading" /><Bone /></div>
        {section === "" ? (
          <>
            <div className="panel pad"><Bone kind="title" /><Bone /></div>
            <div className="stats">{Array.from({ length: 4 }, (_, i) => <div className="stat" key={i}><Bone /><Bone kind="heading" /><Bone kind="short" /></div>)}</div>
            <div className="overview-grid">
              <div className="panel pad"><Bone kind="title" /><div className="skeleton-chart">{[45, 70, 55, 85, 60, 95, 75].map((height, i) => <div className="skeleton-bone" style={{ height: `${height}%` }} key={i} />)}</div></div>
              <Table />
            </div>
            <Table />
          </>
        ) : section === "employees" && detail ? (
          <div className="two-column"><Card /><Form /></div>
        ) : ["employees", "hardware"].includes(section) ? (
          <>
            <div className="skeleton-toolbar"><Bone kind="input" /><Bone kind="button" /></div>
            <div className="employee-grid">{Array.from({ length: 6 }, (_, i) => <Card key={i} image={section === "hardware"} />)}</div>
          </>
        ) : section === "settings" ? (
          <><div className="skeleton-toolbar"><Bone kind="button" /><Bone kind="button" /><Bone kind="button" /></div><Form /></>
        ) : (
          <>{section === "tags" && <Form />}<div className="skeleton-toolbar"><Bone kind="input" /><Bone kind="button" /></div><Table /></>
        )}
      </div>
    </div>
  );
}
