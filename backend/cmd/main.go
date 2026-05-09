package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/di"
)

func main() {
	_ = godotenv.Load("./config/.env")

	root := &cobra.Command{Use: "backend"}
	root.AddCommand(serveCmd())

	if err := root.Execute(); err != nil {
		log.Println(err)
		os.Exit(1)
	}
}

func serveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start the HTTP server",
		Run: func(*cobra.Command, []string) {
			fx.New(di.App()).Run()
		},
	}
}
