class APIERROR extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
}

export const errorHandler = (err, req, res, next) => {
    if (err instanceof APIERROR) {
        return res.status(err.status).json({ message: err.message, status: err.status, success: false });
    }

    res.status(500).json({ message: "Server Error", success: false });
};
