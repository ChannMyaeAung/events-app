import React from "react";
import { StickyBanner } from "./ui/sticky-banner";

const StickyBannerPage = () => {
  return (
    <div className="relative flex w-full flex-col overflow-y-auto">
      <StickyBanner className="bg-linear-to-b from-blue-500 to-blue-600 flex-col">
        <p className="mx-0 max-w-[90%] text-white drop-shadow-md">
          This backend is deployed on Render free plan so it might take a while
          for it to wake up - 50 seconds according to Render official docs.{" "}
        </p>
        <br />
        <div className="flex items-center gap-12">
          <div>
            <p>For Testing (User 1):</p>
            <p>email: johndoe@example.com</p>
            <p>password: password123</p>
          </div>

          <div>
            <p>For Testing (User 2):</p>
            <p>email: user@example.com</p>
            <p>password: password123</p>
          </div>
        </div>
      </StickyBanner>
    </div>
  );
};

export default StickyBannerPage;
