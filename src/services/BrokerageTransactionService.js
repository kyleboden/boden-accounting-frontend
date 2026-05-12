import axios from 'axios'
import {
	listBrokerageTotals,
	createBrokerageTotal,
	updateBrokerageTotal
} from './BrokerageTotalService.js'

const REST_API_BASE_URL = 'http://localhost:8080/api/brokerage-transactions'

export const listBrokerageTransactions = () => axios.get(REST_API_BASE_URL)

export const getBrokerageTransaction = (transactionId) => axios.get(`${REST_API_BASE_URL}/${transactionId}`)

export const deleteBrokerageTransaction = (transactionId) => axios.delete(`${REST_API_BASE_URL}/${transactionId}`)

// helper: extract YYYY-MM from a date string like YYYY-MM-DD
function monthKey(dateStr) {
	if (!dateStr) return null
	const s = String(dateStr)
	return s.length >= 7 ? s.substring(0,7) : null
}

function prevMonthKey(yyyyMm) {
	if (!yyyyMm) return null
	const parts = yyyyMm.split('-')
	if (parts.length !== 2) return null
	let year = Number(parts[0])
	let month = Number(parts[1])
	month -= 1
	if (month === 0) {
		month = 12
		year -= 1
	}
	return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}`
}

function signedAmountFor(tx) {
	const amt = Number(tx.amount ?? 0)
	return tx.type === 'WITHDRAWAL' ? -amt : amt
}

// apply delta for a particular month. deltaAmount and deltaTithed can be negative.
function applyDeltaToMonth(month, deltaAmount, deltaTithed) {
	// returns a promise
	return listBrokerageTotals().then((res) => {
		const items = Array.isArray(res.data) ? res.data.slice() : []
		// find current month total
		const current = items.find((t) => monthKey(t.date) === month)
		const prevKey = prevMonthKey(month)
		const prev = items.find((t) => monthKey(t.date) === prevKey)

		if (!current) {
			// creating a new month total: enforce previous month exists unless this is the very first total
			const allowCreateWhenEmpty = items.length === 0
			// if (!allowCreateWhenEmpty && !prev) {
			// 	window.alert('Cannot create brokerage total for this month because the previous month total does not exist. Please add previous month first.')
			// 	return Promise.reject(new Error('previous month total missing'))
			// }

			const baseTotalInAccount = prev ? Number(prev.totalInAccount ?? 0) : 0
			const baseTotalTithed = prev ? Number(prev.totalTithed ?? 0) : 0

			const newTotal = {
				// store a canonical date for the month (use first day of month)
				date: `${month}-01`,
				totalInAccount: baseTotalInAccount + Number(deltaAmount ?? 0),
				totalTithed: baseTotalTithed + Number(deltaTithed ?? 0)
			}

			return createBrokerageTotal(newTotal)
		}

		// update existing month
		const updated = {
			...current,
			totalInAccount: Number(current.totalInAccount ?? 0) + Number(deltaAmount ?? 0),
			totalTithed: Number(current.totalTithed ?? 0) + Number(deltaTithed ?? 0)
		}

		return updateBrokerageTotal(current.id, updated)
	})
}

export const createBrokerageTransaction = (transaction) => {
	// create the transaction, then update/create the corresponding brokerage total for the transaction month
	return axios.post(REST_API_BASE_URL, transaction).then((txRes) => {
		try {
			const month = monthKey(transaction.date)
			const delta = signedAmountFor(transaction)
			const deltaTithed = transaction.tithed ? delta : 0
			return applyDeltaToMonth(month, delta, deltaTithed).then(() => txRes)
		} catch (err) {
			// if something synchronous throws, still return the original transaction response
			console.error(err)
			return txRes
		}
	})
}

export const updateBrokerageTransaction = (transactionId, transaction) => {
	// Get original transaction so we can compute deltas, then update transaction and apply deltas to affected months
	return getBrokerageTransaction(transactionId).then((origRes) => {
		const orig = origRes.data
		const origMonth = monthKey(orig.date)
		const newMonth = monthKey(transaction.date)

		const origSigned = signedAmountFor(orig)
		const newSigned = signedAmountFor(transaction)

		const origTithedContrib = orig.tithed ? origSigned : 0
		const newTithedContrib = transaction.tithed ? newSigned : 0

		// perform update of transaction first
		return axios.put(`${REST_API_BASE_URL}/${transactionId}`, transaction).then((txRes) => {
			// if month unchanged, apply single delta
			if (origMonth === newMonth) {
				const deltaAmount = newSigned - origSigned
				const deltaTithed = newTithedContrib - origTithedContrib
				return applyDeltaToMonth(newMonth, deltaAmount, deltaTithed).then(() => txRes)
			}

			// month changed: remove from old month then add to new month
			const removeAmount = -origSigned
			const removeTithed = -origTithedContrib
			return applyDeltaToMonth(origMonth, removeAmount, removeTithed)
				.then(() => applyDeltaToMonth(newMonth, newSigned, newTithedContrib))
				.then(() => txRes)
		})
	})
}