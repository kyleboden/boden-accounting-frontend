import React from 'react'
import { Link } from 'react-router-dom'

const HeaderComponent = () => {
  return (
    <div>
        <header>
            <nav className='navbar navbar-dark bg-dark px-3'>
                <Link className="navbar-brand text-white" to='/monthly-reviews'>Monthly Review Tracker</Link>
                <div className='ms-auto d-flex gap-3 align-items-center'>
                    <Link className='nav-link text-white px-2' to='/monthly-reviews'>Monthly Reviews</Link>
                    <Link className='nav-link text-white px-2' to='/brokerage-transactions'>Brokerage Transactions</Link>
                </div>
            </nav>
        </header>

    </div>
  )
}

export default HeaderComponent