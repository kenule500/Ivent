
import { buttonVariants } from "@/components/ui/button";
import Link from "next/dist/client/link";
import Image from "next/image";
import { Calendar, Users, Ticket, Shield, Sparkles, Zap, Globe, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="pb-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10 px-6">
          {/* left */}
          <div className="text-center sm:text-left">
            <span className="text-gray-500 font-light tracking-wide mb-6 inline-block">
              Ivent <span className="text-purple-400">*</span>
            </span>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-[0.95] tracking-tight">
              Discover & <br/>
              create amazing
              <br/>
              <span className="bg-linear-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">event.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-lg font-light">
              Whether you&apos;re hosting or attending, Ivent is the perfect platform to connect with like-minded individuals and make your event a success.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
              <Link className={buttonVariants({ size: "lg", className: "px-8" })} href="/explore">
                Get Started
              </Link>
              <Link className={buttonVariants({ variant: "outline", size: "lg", className: "px-8" })} href="/explore">
                Explore Events
              </Link>
            </div>
          </div>
        {/* right */}
          <div className="relative">
            <div className="absolute inset-0 bg-linear-to-r from-purple-500/20 to-orange-500/20 rounded-full blur-3xl" />
            <Image src={"/hero.gif"} alt="Hero Image" width={700} height={700} priority className="relative z-10"/>
          </div>
        </div>
      </section> 

      {/* Stats Section */}
      <section className="py-16 border-y border-white/5 bg-white/2">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">10K+</div>
              <div className="text-gray-400">Events Created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">50K+</div>
              <div className="text-gray-400">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">100+</div>
              <div className="text-gray-400">Cities Worldwide</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">98%</div>
              <div className="text-gray-400">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose <span className="text-purple-400">Ivent</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to create, manage, and discover amazing events
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Calendar className="w-10 h-10 text-purple-400" />}
              title="Easy Event Creation"
              description="Create stunning event pages in minutes with our intuitive tools and templates."
            />
            <FeatureCard 
              icon={<Users className="w-10 h-10 text-blue-400" />}
              title="Connect & Network"
              description="Meet like-minded people and build lasting connections at events that matter to you."
            />
            <FeatureCard 
              icon={<Ticket className="w-10 h-10 text-orange-400" />}
              title="Smart Ticketing"
              description="Flexible ticketing options with secure payments and easy check-in."
            />
            <FeatureCard 
              icon={<Shield className="w-10 h-10 text-green-400" />}
              title="Trusted Platform"
              description="Secure payments, verified organizers, and 24/7 support for peace of mind."
            />
            <FeatureCard 
              icon={<Zap className="w-10 h-10 text-yellow-400" />}
              title="Real-time Updates"
              description="Stay informed with instant notifications and live event updates."
            />
            <FeatureCard 
              icon={<Globe className="w-10 h-10 text-pink-400" />}
              title="Global Reach"
              description="Discover events worldwide or host your own for a global audience."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 bg-white/2">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="text-purple-400">Works</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="01"
              icon={<Sparkles className="w-8 h-8" />}
              title="Create Your Event"
              description="Sign up and create your event page with all the details, images, and ticket options."
            />
            <StepCard 
              number="02"
              icon={<TrendingUp className="w-8 h-8" />}
              title="Promote & Share"
              description="Share your event on social media and watch registrations grow with our built-in tools."
            />
            <StepCard 
              number="03"
              icon={<Users className="w-8 h-8" />}
              title="Host & Connect"
              description="Host your event, check in attendees, and create memorable experiences."
            />
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Popular <span className="text-purple-400">Categories</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Explore events across diverse categories
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <CategoryCard emoji="🎵" name="Music" count="2.4k events" />
            <CategoryCard emoji="💼" name="Business" count="1.8k events" />
            <CategoryCard emoji="🎨" name="Arts & Culture" count="1.2k events" />
            <CategoryCard emoji="🏃" name="Sports" count="950 events" />
            <CategoryCard emoji="🍔" name="Food & Drink" count="840 events" />
            <CategoryCard emoji="💻" name="Technology" count="720 events" />
            <CategoryCard emoji="🎭" name="Theater" count="560 events" />
            <CategoryCard emoji="🎓" name="Education" count="480 events" />
          </div>

          <div className="text-center mt-12">
            <Link href="/explore" className={buttonVariants({ variant: "outline", size: "lg" })}>
              View All Categories
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-linear-to-r from-purple-600/20 via-blue-600/20 to-orange-600/20 rounded-3xl p-12 md:p-16 text-center border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-r from-purple-500/10 to-orange-500/10 blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Create Your First Event?
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of organizers who trust Ivent to bring their events to life. Start creating today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create-event" className={buttonVariants({ size: "lg", className: "px-8" })}>
                  Create Event Now
                </Link>
                <Link href="/explore" className={buttonVariants({ variant: "outline", size: "lg", className: "px-8" })}>
                  Browse Events
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-purple-500/30 transition-all hover:transform hover:-translate-y-1 group">
      <div className="mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative p-8 rounded-2xl bg-white/3 border border-white/5 text-center">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-6xl font-bold text-white/5">
        {number}
      </div>
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-linear-to-r from-purple-500 to-orange-500 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function CategoryCard({ emoji, name, count }: { emoji: string; name: string; count: string }) {
  return (
    <Link 
      href={`/explore`}
      className="p-6 rounded-2xl bg-white/3 border border-white/5 hover:border-purple-500/30 transition-all hover:transform hover:-translate-y-1 text-center group"
    >
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{emoji}</div>
      <h3 className="font-semibold mb-1">{name}</h3>
      <p className="text-sm text-gray-400">{count}</p>
    </Link>
  );
}
