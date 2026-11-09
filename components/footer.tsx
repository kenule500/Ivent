import { Play, Video, X } from "lucide-react";
import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-gray-800/50 py-8 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-6 text-sm text-gray-400">
        Made with ❤️ by KENULE NWINEE
      </div>

      <div className="flex gap-4 items-center">
        <a
          href="https://www.youtube.com/roadsidecoder"
          aria-label="Ivent on YouTube"
          className="rounded p-2 text-gray-400 focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <Video className="w-5 h-5" aria-hidden="true" />
        </a>
        <a
          href="https://www.instagram.com/roadsidecoder"
          aria-label="Ivent on Instagram"
          className="rounded p-2 text-gray-400 focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <Play className="w-5 h-5" aria-hidden="true" />
        </a>
        <a
          href="https://x.com/Piyush_eon"
          aria-label="Ivent on X"
          className="rounded p-2 text-gray-400 focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
