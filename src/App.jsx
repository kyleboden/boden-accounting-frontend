import './App.css'
import MonthlyReviewComponent from './components/MonthlyReviewComponent.jsx'
import MonthlyReviewConfirmationComponent from './components/MonthlyReviewConfirmationComponent.jsx'
import FooterComponent from "./components/FooterComponent"
import HeaderComponent from "./components/HeaderComponent"
import ListMonthlyReviewComponent from "./components/ListMonthlyReviewComponent.jsx"
import ListBrokerageTransactionsComponent from "./components/ListBrokerageTransactionsComponent.jsx"
import BrokerageTransactionComponent from './components/BrokerageTransactionComponent.jsx'
import {BrowserRouter, Routes, Route} from 'react-router-dom'

function App() {

  return (
    <>
    <BrowserRouter>
      <HeaderComponent />
      <main className="app-content">
        <Routes>
          {/* // http://localhost:3000 */}
          <Route path='/' element = {<ListMonthlyReviewComponent />}></Route>
          {/* // Brokerage Transaction Page */}
          <Route path='/brokerage-transactions' element = {<ListBrokerageTransactionsComponent />}></Route>
          <Route path='/add-brokerage-transaction' element = {<BrokerageTransactionComponent />}></Route>
          <Route path='/edit-brokerage-transaction/:id' element = {<BrokerageTransactionComponent />}></Route>
          {/* // Monthly Review Page*/}
          <Route path='/monthly-reviews' element = {<ListMonthlyReviewComponent />}></Route>
          <Route path='/add-monthly-review' element = {<MonthlyReviewComponent />}></Route>
          <Route path='/monthly-review-confirmation' element = {<MonthlyReviewConfirmationComponent />}></Route>
          <Route path='/edit-monthly-review/:id' element = {<MonthlyReviewComponent />}></Route>
        </Routes>
      </main>
      <FooterComponent />
    </BrowserRouter>
    </>
  )
}

export default App
