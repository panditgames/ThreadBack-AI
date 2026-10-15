import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { storageManager } from '../../src/storage/storageManager';
import { createDemoDataset } from '../../src/demo/demoDataset';
import { DashboardApp } from '../../src/dashboard/App';

describe('Phase 9: Dashboard UI Component & Workflow Tests', () => {
  it('renders dashboard with brand title, search bar, and task cards', async () => {
    render(<DashboardApp />);

    expect(screen.getByText('ThreadBack AI')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search intent threads/i)).toBeInTheDocument();

    // Verify demo task cards are present via headings
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Submit EurekaDev Project' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Compare ANC Headphones' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Physics Assignment Research' })).toBeInTheDocument();
    });
  });

  it('filters cards dynamically when searching', async () => {
    render(<DashboardApp />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Submit EurekaDev Project' })).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search intent threads/i);
    fireEvent.change(searchInput, { target: { value: 'headphones' } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Compare ANC Headphones' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Physics Assignment Research' })).not.toBeInTheDocument();
    });
  });

  it('opens Why Was This Grouped modal when clicking Why? button', async () => {
    render(<DashboardApp />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Submit EurekaDev Project' })).toBeInTheDocument();
    });

    const whyButtons = screen.getAllByTitle(/Why were these tabs grouped/i);
    expect(whyButtons.length).toBeGreaterThan(0);
    fireEvent.click(whyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Why was this grouped?')).toBeInTheDocument();
      expect(screen.getByText(/Clustering Rationale/i)).toBeInTheDocument();
    });
  });

  it('opens Intent Graph modal when clicking Graph button', async () => {
    render(<DashboardApp />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Submit EurekaDev Project' })).toBeInTheDocument();
    });

    const graphButtons = screen.getAllByTitle(/Inspect Intent Graph/i);
    expect(graphButtons.length).toBeGreaterThan(0);
    fireEvent.click(graphButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Structured Intent Graph/i)).toBeInTheDocument();
    });
  });

  it('triggers Resume Task and renders the Resume Briefing Modal', async () => {
    render(<DashboardApp />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Submit EurekaDev Project' })).toBeInTheDocument();
    });

    const resumeButtons = screen.getAllByRole('button', { name: /Resume Task/i });
    expect(resumeButtons.length).toBeGreaterThan(0);
    fireEvent.click(resumeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Task Resumed/i)).toBeInTheDocument();
      expect(screen.getByText(/Last Observed Action/i)).toBeInTheDocument();
      expect(screen.getByText(/Suggested Next Action/i)).toBeInTheDocument();
    });
  });
});


describe('Release UI persistence and privacy workflow', () => {
  beforeEach(async () => { await storageManager.clearAllData(); await storageManager.saveThreads(createDemoDataset()); });
  it('opens timeline and persists manual completion through dashboard remount', async () => {
    const view = render(<DashboardApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    fireEvent.click(screen.getAllByTitle('View chronological timeline')[0]);
    expect(await screen.findByRole('heading', { name: /^Timeline:/ })).toBeInTheDocument();
    view.unmount();
    const next = render(<DashboardApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    fireEvent.click(screen.getAllByLabelText('Task actions')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));
    await waitFor(async () => expect(Object.values((await storageManager.load()).threads).some(t => t.status === 'LIKELY_COMPLETE')).toBe(true));
    next.unmount();
    render(<DashboardApp />);
    expect(await screen.findByText('Completed')).toBeInTheDocument();
  });
  it('keeps delete-all empty when dashboard reloads', async () => {
    await storageManager.clearAllData();
    const view = render(<DashboardApp />);
    expect(await screen.findByText('No matching intent threads')).toBeInTheDocument();
    view.unmount();
    render(<DashboardApp />);
    expect(await screen.findByText('No matching intent threads')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Submit EurekaDev Project' })).not.toBeInTheDocument();
  });
  it('shows content/remote AI unavailable and persists domain privacy edits', async () => {
    render(<DashboardApp />);
    await screen.findByRole('heading', { name: 'Submit EurekaDev Project' });
    fireEvent.click(screen.getByRole('button', { name: /Privacy Center/i }));
    expect(screen.getByLabelText('Page content analysis (unavailable)')).toBeDisabled();
    expect(screen.getByLabelText('Page content analysis (unavailable)')).not.toBeChecked();
    expect(screen.getByLabelText('Remote AI (unavailable)')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Excluded domains'), { target: { value: 'private.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));
    await waitFor(async () => expect((await storageManager.load()).privacy.excludedDomains).toEqual(['private.example']));
  });
});
