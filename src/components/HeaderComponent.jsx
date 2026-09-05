import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

const HeaderComponent = () => {
  const { user, signOut } = useAuth()

  return (
    <div>
        <header>
            <nav className='navbar navbar-dark bg-dark px-3'>
                <Link className="navbar-brand text-white" to='/monthly-reviews'>Boden Accounting</Link>
                <div className='ms-auto d-flex gap-3 align-items-center'>
                    <Link className='nav-link text-white px-2' to='/monthly-reviews'>Monthly Reviews</Link>
                    <Link className='nav-link text-white px-2' to='/brokerage-transactions'>Brokerage</Link>
                    <span className='navbar-text text-white-50 d-none d-md-inline'>{user?.email}</span>
                    <button className='btn btn-outline-light btn-sm' type='button' onClick={signOut}>Sign Out</button>
                </div>
            </nav>
        </header>

    </div>
  )
}

export default HeaderComponent
