import React from "react";
import { StickyBanner } from "./ui/sticky-banner";

const StickyBannerPage = () => {
  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <StickyBanner className="bg-linear-to-b from-blue-500 to-blue-600">
        <p className="mx-0 max-w-[90%] text-white drop-shadow-md">
          This backend is deployed on Render free plan so it might take a while
          for it to wake up - 50 seconds according to Render official docs.{" "}
        </p>
      </StickyBanner>
    </div>
  );
};

export default StickyBannerPage;
