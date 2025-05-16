package api

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type envelope map[string]any

func writeJSON(w http.ResponseWriter, status int, data envelope, headers http.Header) error {
	js, err := json.MarshalIndent(data, "", "\t")
	if err != nil {
		return fmt.Errorf("could not encode JSON: %v", err)
	}

	js = append(js, '\n')

	for key, value := range headers {
		w.Header()[key] = value
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(js)

	return nil
}

func errorResponse(w http.ResponseWriter, status int, message any) {
	env := envelope{"error": message}

	err := writeJSON(w, status, env, nil)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func notFoundResponse(w http.ResponseWriter) {
	errorResponse(w, http.StatusNotFound, "the requested resource could not be found")
}
