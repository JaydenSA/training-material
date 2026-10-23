import { Badge, Heading } from "@/components/ui";
import { productUpdates } from "@/lib/product-updates";
import { formatDate } from "@/lib/format";

export function ProductUpdates() {
  return (
    <>
      <Heading eyebrow="PRODUCT HISTORY" title="What’s new.">
        The features and improvements that make up your restaurant workspace.
      </Heading>
      <section
        className="panel pad updates-intro"
        aria-label="About product updates"
      >
        <div>
          <h2>Built in batches. Recorded in one place.</h2>
          <p>
            Browse the latest changes first, with a breakdown of what each
            development batch added. Dates reflect recorded development work,
            rather than deployment or launch dates.
          </p>
        </div>
        <Badge>{productUpdates.length} development batches</Badge>
      </section>
      <ol className="updates-timeline" aria-label="Development batches">
        {productUpdates.map((update, index) => (
          <li key={update.id}>
            <div className="updates-date">
              <span className="eyebrow">
                BATCH {String(update.batch).padStart(2, "0")}
              </span>
              <time dateTime={update.date}>
                {formatDate(`${update.date}T12:00:00+02:00`, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
            <article
              className="panel updates-card"
              aria-labelledby={`update-${update.id}`}
            >
              <header>
                {index === 0 && <Badge>Latest update</Badge>}
                <h2 id={`update-${update.id}`}>{update.title}</h2>
                <p>{update.summary}</p>
              </header>
              <ul className="updates-features">
                {update.features.map((feature) => (
                  <li key={feature.title}>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
      <p className="updates-footnote">
        This is the product’s development history. Restaurant-specific actions
        are recorded separately in Activity. Live payment processing,
        subscription billing and physical NFC verification still require their
        respective setup and checks.
      </p>
    </>
  );
}
