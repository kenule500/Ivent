"use client";

import { SignInButton, useAuth, UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button, buttonVariants } from './ui/button';
import { Authenticated, Unauthenticated } from 'convex/react';
import { BarLoader } from 'react-spinners';
import { useStoreUser } from '@/hooks/useStoreUser';
import { CalendarDays, Crown, Plus, Ticket } from 'lucide-react';
import OnboardingModal from './onboarding-modal';
import { useOnboarding } from '@/hooks/use-onboarding';
import SearchLocationBar from './search-location-bar';
import { Badge } from './ui/badge';
import UpgradeModal from './upgrade-modal';

const Header = () => {
  const { isLoading } = useStoreUser();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { showOnboarding, handleOnboardingComplete, handleOnboardingSkip } = useOnboarding();
  const { has } = useAuth();
  const hasPro = has?.({ plan: "pro" });    

  return (
    <>
      <nav className='fixed top-0 left-0 right-0 backdrop-blur-xl z-20 border-b'>
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
          {/* LOGO */}
          <Link href="/" className='flex items-center'>
            <Image src="/spott.png" alt="Spott Logo" width={500} height={500} className='w-full h-11' priority />
            {hasPro && (
              <Badge className="bg-linear-to-r from-pink-500 to-orange-500 gap-1 text-white ml-3">
                <Crown className="w-3 h-3" />
                Pro
              </Badge>
            )}
          </Link>
          
          {/* Search & Location - Desktop only */}
          <div className="hidden md:flex flex-1 justify-center">
            <SearchLocationBar />
          </div>
          
          {/* Right side Actions */}
          <div className="flex items-center">
            <Unauthenticated>
              <SignInButton mode='modal'>
                <Button className='mr-2'>Sign In</Button>
              </SignInButton>
            </Unauthenticated>

            {!hasPro && (
              <Button variant="ghost" size="sm" className='mr-2' onClick={() => setShowUpgradeModal(true)}>
                Pricing
              </Button>
            )}
            
            <Button variant="ghost" size="sm" className='mr-2'>
              <Link href="/explore">Explore</Link>
            </Button>

            <Authenticated>
              <Link href="/create-event" className={buttonVariants({ size: "sm", className: 'mr-4 flex items-center gap-2' })}>
                <Plus className='h-4 w-4' />
                <span className='hidden sm:inline'>Create Event</span>
              </Link>

              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Link label='My Tickets' labelIcon={<Ticket size={16} />} href="/my-tickets" />
                  <UserButton.Link label='My Events' labelIcon={<CalendarDays size={16} />} href="/my-events" />
                </UserButton.MenuItems>
              </UserButton>
            </Authenticated>
          </div>
        </div>
   
        {/* Mobile Search & Location */}
        <div className="md:hidden border-t px-3 py-3">
          <SearchLocationBar />
        </div>

        {/* Loader */}
        {isLoading && (
          <BarLoader color="#4F46E5" width="100%" />
        )}

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={handleOnboardingSkip}
          onComplete={handleOnboardingComplete}
        />

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          trigger="header"
        />
      </nav>
    </>
  );
};

export default Header;