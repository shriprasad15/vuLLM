import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PlayerPortal } from './pages/PlayerPortal'
import { AdminPortal } from './pages/AdminPortal'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerPortal />} />
        <Route path="/admin" element={<AdminPortal />} />
      </Routes>
    </BrowserRouter>
  )
}
