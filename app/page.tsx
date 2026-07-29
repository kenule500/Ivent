import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/dist/client/link";
import Image from "next/image";

export default function Home() {
  return (
    <div >
      <section className="pb-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* left */}
          <div className="text-center sm:text-left">
              <span className="text-gray-500 font-light tracking-wide mb-6">
                Ivent <span className="text-purple-400">*</span>
              </span>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-[0.95] tracking-tight">
                Discover & <br/>
                create amazing
                <br/>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">event.</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-lg font-light">
                Whether you&apros;re hosting or  attending, Ivent is the perfect platform to connect with like-minded individuals and make your event a success.
              </p>

              <Link className={buttonVariants({ size: "xl" })} href="/explore">
                Get Started
              </Link>
          </div>
        {/* right */}
          <div>
            <Image src={"/hero.gif"} alt="Hero Image" width={700} height={700} priority/>
          </div>
        </div>
      </section> 
    </div>
  );
}
