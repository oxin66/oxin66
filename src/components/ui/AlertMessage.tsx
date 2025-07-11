'use client'; // If it needs to be closed by user interaction

import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertMessageProps {
  type: AlertType;
  title?: string;
  message: string | React.ReactNode;
  onClose?: () => void; // Optional: for dismissable alerts
  className?: string;
}

const AlertMessage: React.FC<AlertMessageProps> = ({ type, title, message, onClose, className = '' }) => {
  let bgColor = '';
  let borderColor = '';
  let textColor = '';
  let IconComponent: React.ElementType = InformationCircleIcon;

  switch (type) {
    case 'success':
      bgColor = 'bg-green-50 dark:bg-green-900/20';
      borderColor = 'border-green-400 dark:border-green-600';
      textColor = 'text-green-700 dark:text-green-300';
      IconComponent = CheckCircleIcon;
      break;
    case 'error':
      bgColor = 'bg-red-50 dark:bg-red-900/20';
      borderColor = 'border-red-400 dark:border-red-600';
      textColor = 'text-red-700 dark:text-red-400';
      IconComponent = XCircleIcon;
      break;
    case 'warning':
      bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
      borderColor = 'border-yellow-400 dark:border-yellow-600';
      textColor = 'text-yellow-700 dark:text-yellow-400';
      IconComponent = ExclamationTriangleIcon;
      break;
    case 'info':
      bgColor = 'bg-blue-50 dark:bg-blue-900/20';
      borderColor = 'border-blue-400 dark:border-blue-600';
      textColor = 'text-blue-700 dark:text-blue-400';
      IconComponent = InformationCircleIcon;
      break;
  }

  return (
    <div
      className={`p-4 rounded-md border-r-4 ${bgColor} ${borderColor} ${textColor} ${className}`}
      role="alert"
      dir="rtl"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${textColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 mr-2 flex-1">
          {title && <h3 className={`text-sm font-medium ${textColor}`}>{title}</h3>}
          <div className={`text-sm ${textColor} ${title ? 'mt-1' : ''}`}>
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${type === 'success' ? 'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600' : ''}
                  ${type === 'error' ? 'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-offset-red-50 focus:ring-red-600' : ''}
                  ${type === 'warning' ? 'bg-yellow-50 text-yellow-500 hover:bg-yellow-100 focus:ring-offset-yellow-50 focus:ring-yellow-600' : ''}
                  ${type === 'info' ? 'bg-blue-50 text-blue-500 hover:bg-blue-100 focus:ring-offset-blue-50 focus:ring-blue-600' : ''}
                  dark:bg-transparent dark:hover:bg-white/10
                `}
              >
                <span className="sr-only">بستن</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertMessage;
