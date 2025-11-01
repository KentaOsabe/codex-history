import '@testing-library/jest-dom'
import { server } from '@/api/testServer'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
