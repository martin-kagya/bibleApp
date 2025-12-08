import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mic, Presentation, Database, BookOpen } from 'lucide-react'

const Header = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Presentation', icon: Presentation },
    { path: '/speech', label: 'Speech Recognition', icon: Mic },
    { path: '/database', label: 'Scripture Database', icon: Database },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight font-display">
              Bible Presentation App
            </h1>
          </div>

          <nav className="flex space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === path
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header

