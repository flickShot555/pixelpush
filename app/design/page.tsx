import { Suspense } from "react";

import { DesignClient } from "./DesignClient";

export default function DesignPage() {
  return (
    <Suspense fallback={null}>
      <DesignClient />
    </Suspense>
  );
}
