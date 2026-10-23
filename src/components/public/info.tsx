"use client";
import { Badge, Heading } from "@/components/ui";

export function Info({ page }: { page: string }) {
  return (
    <div className="public-content narrow">
      <Heading
        title={
          page === "help"
            ? "A little help, when you need it."
            : page === "privacy"
              ? "Privacy overview"
              : "Terms overview"
        }
      />
      {page === "help" ? (
        <>
          <h3>Who receives the tip?</h3>
          <p>
            The restaurant receives payment through its Yoco account. Ask
            restaurant management about staff distribution.
          </p>
          <h3>My tag is inactive</h3>
          <p>
            A restaurant manager can check the assignment and status in QR & NFC
            tags. Archived employee profiles cannot accept tips.
          </p>
          <h3>Can I get a refund?</h3>
          <p>
            Contact the restaurant with your payment reference. Refunds require
            the restaurant’s authorized payment process.
          </p>
          <h3>Can I demo without integrations?</h3>
          <p>
            Yes. All sample data is stored in this browser. Use Settings → Demo
            controls to reset it.
          </p>
        </>
      ) : (
        <>
          <Badge muted>Draft for client review</Badge>
          <p>
            This describes proposed product behaviour and is not a final
            published policy. Final legal documents must be approved before
            production launch.
          </p>
          <h3>
            {page === "privacy"
              ? "Data used by the product"
              : "How the service works"}
          </h3>
          <p>
            {page === "privacy"
              ? "Restaurant account details, employee names and optional profile information, tip references, amounts, and ratings are used to deliver the service. Card details are handled by the payment provider, not stored by Tipit."
              : "Tipit provides restaurant tipping pages and employee attribution. Restaurants receive payments through their own payment accounts, absorb processing fees, and manage employee distributions."}
          </p>
          <h3>
            {page === "privacy"
              ? "Visibility and retention"
              : "Subscriptions and hardware"}
          </h3>
          <p>
            {page === "privacy"
              ? "Public employee profiles should be published with appropriate notice and permission. Archiving disables tipping while preserving necessary transaction records. Production retention, access, deletion, and anonymisation processes must be defined."
              : "Subscriptions and hardware purchases are separate from guest tips. Prices in this demo are illustrative. Live billing, delivery, cancellation, and refund terms must be agreed before launch."}
          </p>
          <h3>Demo data</h3>
          <p>
            This demo uses sample identities and local browser storage. Do not
            enter sensitive personal information or live payment credentials.
          </p>
        </>
      )}
    </div>
  );
}
