import React from "react";
import { StickyBanner } from "./ui/sticky-banner";

const StickyBannerPage = () => {
  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <StickyBanner className="bg-linear-to-b from-blue-500 to-blue-600">
        <p className="text-white drop-shadow-md text-sm">
          Backend hosted on Render free plan — first load may take up to 50s to wake up. Use the demo accounts on the login page to get started quickly.
        </p>
      </StickyBanner>
    </div>
  );
};

export default StickyBannerPage;
