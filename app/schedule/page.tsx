import { Suspense } from "react";

import { ScheduleClient } from "./ScheduleClient";

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <ScheduleClient />
    </Suspense>
  );
}
