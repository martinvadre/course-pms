import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
(globalThis as Record<string, unknown>).localStorage = localStorageMock;

describe('CoursePMS Client UI Component Suite', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders login view when unauthenticated and validates empty credentials', () => {
    render(<App />);
    expect(screen.getByText('Sign In to CoursePMS')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('login-submit'));
    expect(screen.getByTestId('auth-error')).toHaveTextContent(
      'Email and password are required.'
    );
  });

  it('populates login inputs when clicking quick-fill demo account buttons', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('quickfill-pawarit'));
    expect(screen.getByTestId('login-email')).toHaveValue('pawarit@mail.kmutt.ac.th');
    expect(screen.getByTestId('login-password')).toHaveValue('Password123!');
  });
});
