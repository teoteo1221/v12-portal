import { redirect } from "next/navigation";

// Redirect list view to the marketing hub which already shows all landings
export default function LandingPagesIndexPage() {
  redirect("/marketing");
}
