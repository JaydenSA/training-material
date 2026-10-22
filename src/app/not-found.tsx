import Link from "next/link";
export default function NotFound() {
  return (
    <main className="public-content center">
      <div className="eyebrow">404</div>
      <h1>This page isn’t available.</h1>
      <p>Check your link or return to Tipit.</p>
      <Link className="button" href="/">
        Back home
      </Link>
    </main>
  );
}
