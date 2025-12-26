import hotToast from "react-hot-toast";

type ToastId = string;

function join(message: string, description?: string) {
  return description ? `${message}\n${description}` : message;
}

export const toast = {
  loading: (message: string, description?: string): ToastId =>
    hotToast.loading(join(message, description)),

  success: (message: string, options?: { description?: string; id?: ToastId }) =>
    hotToast.success(join(message, options?.description), { id: options?.id }),

  error: (message: string, options?: { description?: string; id?: ToastId }) =>
    hotToast.error(join(message, options?.description), { id: options?.id }),

  info: (message: string, options?: { description?: string; id?: ToastId }) =>
    hotToast(join(message, options?.description), { id: options?.id }),

  dismiss: (id?: ToastId) => hotToast.dismiss(id),
};

export type { ToastId };
