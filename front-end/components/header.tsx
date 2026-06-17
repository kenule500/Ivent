import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const Header = () => {
  return (
    <>
        <nav className='fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-xl z-20 border-b'>
            <div className="max-w-7xl mx-auto flex items-center justify-between py-4 px-6">
                {/* LOGO */}
                <Link href="/" className='flex items-center'>
                    <Image src="/spott.png" alt="Spott Logo" width={500} height={500} className='w-full h-11' priority/>
                </Link>
                {/* Search & Location -Destop only */}

                {/* Right side Actions */}
            </div>
   
            {/* Mobile Search & Location  */}
        </nav>
    </>
  )
}

export default Header