from services.integration import sync_pipefy


def main():
    resultado = sync_pipefy(first=200)

    print("=== RESULTADO DA SINCRONIZAÇÃO ===")
    print(resultado)

    if resultado.get("status") != "success":
        raise RuntimeError(resultado.get("message", "Falha na sincronização"))


if __name__ == "__main__":
    main()