<?php

return [

    /*
    |--------------------------------------------------------------------------
    | French language lines for the validator
    |--------------------------------------------------------------------------
    */

    'accepted'        => 'Le champ :attribute doit être accepté.',
    'accepted_if'     => 'Le champ :attribute doit être accepté quand :other a la valeur :value.',
    'active_url'      => 'Le champ :attribute n\'est pas une URL valide.',
    'after'           => 'Le champ :attribute doit être une date postérieure au :date.',
    'after_or_equal'  => 'Le champ :attribute doit être une date postérieure ou égale au :date.',
    'array'           => 'Le champ :attribute doit être un tableau.',
    'before'          => 'Le champ :attribute doit être une date antérieure au :date.',
    'before_or_equal' => 'Le champ :attribute doit être une date antérieure ou égale au :date.',
    'boolean'         => 'Le champ :attribute doit être vrai ou faux.',
    'confirmed'       => 'Le champ de confirmation :attribute ne correspond pas.',
    'current_password'=> 'Le mot de passe est incorrect.',
    'date'            => 'Le champ :attribute n\'est pas une date valide.',
    'date_equals'     => 'Le champ :attribute doit être une date égale à :date.',
    'date_format'     => 'Le champ :attribute ne correspond pas au format :format.',
    'different'       => 'Les champs :attribute et :other doivent être différents.',
    'digits'          => 'Le champ :attribute doit avoir :digits chiffres.',
    'digits_between'  => 'Le champ :attribute doit avoir entre :min et :max chiffres.',
    'dimensions'      => 'Le champ :attribute a des dimensions d\'image non valides.',
    'distinct'        => 'Le champ :attribute a une valeur en double.',
    'email'           => 'Le champ :attribute doit être une adresse e-mail valide.',
    'ends_with'       => 'Le champ :attribute doit se terminer par l\'une des valeurs suivantes : :values.',
    'exists'          => 'Le champ :attribute sélectionné est invalide.',
    'file'            => 'Le champ :attribute doit être un fichier.',
    'filled'          => 'Le champ :attribute doit avoir une valeur.',
    'gt'              => [
        'array'   => 'Le champ :attribute doit avoir plus de :value éléments.',
        'file'    => 'Le champ :attribute doit être supérieur à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur à :value.',
        'string'  => 'Le champ :attribute doit être plus long que :value caractères.',
    ],
    'gte'             => [
        'array'   => 'Le champ :attribute doit avoir :value éléments ou plus.',
        'file'    => 'Le champ :attribute doit être supérieur ou égal à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur ou égal à :value.',
        'string'  => 'Le champ :attribute doit contenir au moins :value caractères.',
    ],
    'image'           => 'Le champ :attribute doit être une image.',
    'in'              => 'La valeur sélectionnée pour le champ :attribute est invalide.',
    'integer'         => 'Le champ :attribute doit être un entier.',
    'ip'              => 'Le champ :attribute doit être une adresse IP valide.',
    'json'            => 'Le champ :attribute doit être une chaîne JSON valide.',
    'lt'              => [
        'array'   => 'Le champ :attribute doit avoir moins de :value éléments.',
        'file'    => 'Le champ :attribute doit être inférieur à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être inférieur à :value.',
        'string'  => 'Le champ :attribute doit contenir moins de :value caractères.',
    ],
    'lte'             => [
        'array'   => 'Le champ :attribute doit avoir :value éléments ou moins.',
        'file'    => 'Le champ :attribute doit être inférieur ou égal à :value kilo-octets.',
        'numeric' => 'Le champ :attribute doit être inférieur ou égal à :value.',
        'string'  => 'Le champ :attribute doit contenir au plus :value caractères.',
    ],
    'max'             => [
        'array'   => 'Le champ :attribute ne peut pas avoir plus de :max éléments.',
        'file'    => 'Le champ :attribute ne peut pas être supérieur à :max kilo-octets.',
        'numeric' => 'Le champ :attribute ne peut pas être supérieur à :max.',
        'string'  => 'Le champ :attribute ne peut pas contenir plus de :max caractères.',
    ],
    'mimes'           => 'Le champ :attribute doit être un fichier de type : :values.',
    'mimetypes'       => 'Le champ :attribute doit être un fichier de type : :values.',
    'min'             => [
        'array'   => 'Le champ :attribute doit avoir au moins :min éléments.',
        'file'    => 'Le champ :attribute doit être supérieur à :min kilo-octets.',
        'numeric' => 'Le champ :attribute doit être supérieur ou égal à :min.',
        'string'  => 'Le champ :attribute doit contenir au moins :min caractères.',
    ],
    'multiple_of'     => 'Le champ :attribute doit être un multiple de :value.',
    'not_in'          => 'Le champ :attribute sélectionné est invalide.',
    'not_regex'       => 'Le format du champ :attribute est invalide.',
    'numeric'         => 'Le champ :attribute doit être un nombre.',
    'present'         => 'Le champ :attribute doit être présent.',
    'regex'           => 'Le format du champ :attribute est invalide.',
    'required'        => 'Le champ :attribute est obligatoire.',
    'required_if'     => 'Le champ :attribute est obligatoire quand le champ :other est :value.',
    'required_unless' => 'Le champ :attribute est obligatoire sauf si :other est dans :values.',
    'required_with'   => 'Le champ :attribute est obligatoire quand :values est présent.',
    'required_with_all' => 'Le champ :attribute est obligatoire quand :values sont présents.',
    'required_without' => 'Le champ :attribute est obligatoire quand :values n\'est pas présent.',
    'required_without_all' => 'Le champ :attribute est obligatoire quand aucun de :values n\'est présent.',
    'same'            => 'Les champs :attribute et :other doivent être identiques.',
    'size'            => [
        'array'   => 'Le champ :attribute doit contenir :size éléments.',
        'file'    => 'Le champ :attribute doit avoir une taille de :size kilo-octets.',
        'numeric' => 'Le champ :attribute doit avoir une taille de :size.',
        'string'  => 'Le champ :attribute doit avoir une taille de :size caractères.',
    ],
    'starts_with'     => 'Le champ :attribute doit commencer par l\'une des valeurs suivantes : :values.',
    'string'          => 'Le champ :attribute doit être une chaîne de caractères.',
    'timezone'        => 'Le champ :attribute doit être un fuseau horaire valide.',
    'unique'          => 'La valeur du champ :attribute est déjà utilisée.',
    'uploaded'        => 'Le téléversement du champ :attribute a échoué.',
    'url'             => 'Le format de l\'URL de :attribute est invalide.',
    'uuid'            => 'Le champ :attribute doit être un UUID valide.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes
    |--------------------------------------------------------------------------
    */

    'attributes' => [
        'full_name'     => 'nom complet',
        'first_name'    => 'prénom',
        'last_name'     => 'nom',
        'class_id'      => 'classe',
        'student_id'    => 'élève',
        'nature'        => 'nature',
        'amount'        => 'montant',
        'method'        => 'moyen de paiement',
        'status'        => 'statut',
        'note'          => 'remarque',
        'email'         => 'adresse e-mail',
        'password'      => 'mot de passe',
        'phone'         => 'téléphone',
        'is_active'     => 'statut actif',
        'modules'       => 'modules',
        'feeSettings'   => 'frais de scolarité',
        'classes'       => 'classes',
        'discountRates' => 'taux de réduction',
        'confirm_password' => 'confirmation du mot de passe',
    ],

];