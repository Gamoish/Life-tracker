import { PageHeader } from "@/components/ui";
import { getSettings } from "./queries";
import SettingsView from "./SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader title="Settings" subtitle="App-wide preferences" />
      <SettingsView settings={settings} />
    </>
  );
}
