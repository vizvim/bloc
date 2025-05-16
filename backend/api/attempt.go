package api

import (
	"net/http"

	"github.com/rs/zerolog"
)

type createAttemptDatastore interface{}

func createAttemptHandler(_ *zerolog.Logger, _ createAttemptDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotImplemented)
	}
}

type getAttemptDatastore interface{}

func getAttemptHandler(_ *zerolog.Logger, _ getAttemptDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotImplemented)
	}
}
