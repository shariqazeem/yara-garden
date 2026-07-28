import { redirect } from "next/navigation";

// The companion intake now lives inside the world as Yara's first conversation.
// Anyone landing on the old route is sent straight into Yara's world (now the root).
export default function CompanionPage() {
  redirect("/");
}
