package api

import (
	"net/http"

	"github.com/rs/zerolog"
)

type createProblemDatastore interface {
}

func createProblemHandler(_ *zerolog.Logger, _ createProblemDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotImplemented)
	}
}

type getProblemDatastore interface {
}

func getProblemHandler(_ *zerolog.Logger, _ getProblemDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotImplemented)
	}
}
