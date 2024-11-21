clean_sso() {
    rm -rf ~/.aws/cli
    rm -rf ~/.aws/sso
}

echo_env() {
    echo -e "\n$1"
    echo; env | grep -i aws
    echo; env | grep -i target
}

set_env() {
    export AWS_PROFILE=$1
    echo_env "Environment has been changed to: $AWS_PROFILE"
}

change_env() {
    PS3="Select the LIC Environment: "

    select lic_env in \
        lic-dev \
        lic-test \
        Exit
    do
        case $lic_env in
            "lic-dev")
                set_env "lic-dev"
                break;;
            "lic-test")
                set_env "lic-test"
                break;;       
            "Exit")
                echo "Exiting script."
                break;;
            *)
            echo "Invalid option $REPLY. Please try again.";;
        esac
    done
}

echo_env "Environment is set to: $AWS_PROFILE"
