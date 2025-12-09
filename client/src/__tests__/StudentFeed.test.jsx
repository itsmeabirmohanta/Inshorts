import { render, screen } from '@testing-library/react';
import axios from 'axios';
import StudentFeed from '../pages/StudentFeed';

vi.mock('axios');

test('renders loading state then announcements', async () => {
  axios.get.mockResolvedValue({ data: { data: [{ _id: '1', title: 'Test', summary: 'S', imageUrl: '', category: 'Academic', createdAt: new Date().toISOString() }], page:1, totalPages:1 } });
  render(<StudentFeed />);
  expect(screen.getByText(/Loading feed/i)).toBeInTheDocument();
  // wait for the feed to render
  const title = await screen.findByText('Test');
  expect(title).toBeInTheDocument();
});
