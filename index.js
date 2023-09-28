const express = require("express");
const db = require("./config/db");
const cors = require("cors");
require('dotenv').config();

const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const HttpError = require("./utils/http-errors");

const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());

const uuid = require("uuid");

var corsOptions = {
  origin: "*",
};

app.post("/api/signup", async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { email, password, pseudo } = req.body;
  const id_user = uuid.v4();

   db.query(
    "SELECT utilisateur.* FROM utilisateur WHERE utilisateur.email = ?",
    email,
    (err, result) => {
      if (err) {
        console.log(err, "Signing up failed, please try again later.");
        return res.status(500).send("An error occurred.");
      }

      if (result.length > 0) {
        const error = new HttpError(
          "User exists already, please login instead.",
          422
        );
        return next(error);
      }

      let hashedPassword;
      try {
        hashedPassword = bcrypt.hashSync(password, 12);
      } catch (err) {
        const error = new HttpError(
          "Could not create user, please try again.",
          500
        );
        return next(error);
      }

      const sqlQuery =
        "INSERT INTO utilisateur (id_user, email, password, pseudo) VALUES (?, ?, ?, ?)";

      db.query(
        sqlQuery,
        [id_user, email, hashedPassword, pseudo],
        (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).send("An error occurred.");
          }

          let token;
          try {
            token = jwt.sign(
              { userId: id_user, email: email, pseudo: pseudo },
              process.env.SECRET_KEY,
              { expiresIn: "1h" }
            );
          } catch (err) {
            console.log("Err2: Signing up failed, please try again later.");
            return res.status(500).send("An error occurred.");
          }

          res.status(201).json({
            userId: id_user,
            email: email,
            pseudo: pseudo,
            token: token,
          });
        }
      );
    }
  );
});

app.post("/api/signin", async (req, res, next) => {
  const { email, password } = req.body;
  console.log({ email, password });

  try {
    const existingUser = await new Promise((resolve, reject) => {
      db.query(
        "SELECT utilisateur.* FROM utilisateur WHERE utilisateur.email = ?",
        email,
        (err, result) => {
          if (err) {
            console.log(err, "Signing up failed, please try again later.");
            return reject(err);
          }
          resolve(result[0]); // Assuming you want the first matching user
        }
      );
    });

    if (!existingUser || Object.keys(existingUser).length === 0) {
      const error = new HttpError(
        "Invalid credentials (us), could not log you in.",
        403
      );
      return next(error);
    }
    console.log("existingUser.password:", existingUser.password);
    console.log("password:", password);

    let isValidPassword;
    try {
      isValidPassword = bcrypt.compareSync(password, existingUser.password);
      console.log("isValidPassword:", isValidPassword);
    } catch (err) {
      const error = new HttpError(
        "Could not log you in, please check your credentials and try again.",
        500
      );
      return next(error);
    }

    if (!isValidPassword) {
      const error = new HttpError(
        "Invalid credentials (pw), could not log you in.",
        403
      );
      return next(error);
    }
    //console.log(existingUser.id_user)
    let token;
    try {
      token = jwt.sign(
        { userId: existingUser.id_user, email: existingUser.email },
        process.env.SECRET_KEY,
        { expiresIn: "1h" }
      );
      //console.log("verifTok", token)
    } catch (err) {
      const error = new HttpError(
        "Logging in failed, please try again later.",
        500
      );
      return next(error);
    }

    res.json({
      userId: existingUser.id_user,
      email: existingUser.email,
      token: token,
    });
  } catch (err) {
    const error = new HttpError("An error occurred.", 500);
    return next(error);
  }
});


// Route to get user by id
app.get("/api/getuserbyid/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query("SELECT * FROM utilisateur WHERE id_user = ?", userId, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});


  // Route pour mettre à jour un user
  app.post("/api/modifyuser/:userId", (req, res, next) => {
    const userId = req.params.userId;
    const email = req.body.email;
    const pseudo = req.body.pseudo;
    const password = req.body.password;
    const oldPassword = req.body.oldPassword;
    const currentPassword = req.body.currentPassword;

    console.log(pseudo, oldPassword, currentPassword, password);

    let isValidPassword = false;
    try {
      isValidPassword = bcrypt.compareSync(currentPassword, oldPassword);
      console.log("isValidPassword:", isValidPassword);
    } catch (err) {
      const error = new HttpError(
        "Could not validate password, please try again.",
        500
      );
      return next(error);
    }

    if (!isValidPassword) {
      const error = new HttpError(
        "Invalid password, please verify and try again.",
        403
      );
      console.log("Invalid password, could not modify user.");
      return next(error);
    }
    else{
    let hashedPassword;
      try {
        hashedPassword = bcrypt.hashSync(password, 12);
      } catch (err) {
        const error = new HttpError(
          "Could not modify user, please try again.",
          500
        );
        return next(error);
      }
  
    const sqlQuery =
      "UPDATE utilisateur SET email=?, pseudo=?, password=? WHERE id_user=?";
  
    db.query(
      sqlQuery,
      [
        email,
        pseudo,
        hashedPassword,
        userId
      ],
      (err, result) => {
        if (err) {
          console.log(err);
          res.status(500).send("Erreur lors de la mise à jour.");
        } else {
          console.log("Utilisateur avec l'ID:", userId);
          res.status(200).json({ userId: userId }); // Renvoyez l'ID dans la réponse
        }
      }
    );
  }});



// Route to get all recipes
app.get("/api/getallrecipes", (req, res) => {
  db.query("SELECT recette.*, type_plat.libelle AS type_plat, type_plat.icon AS icon, type_cuisson.libelle AS cuisson, theme_plat.libelle AS theme_plat FROM recette INNER JOIN type_plat ON type_plat.id = recette.id_type_plat INNER JOIN type_cuisson ON type_cuisson.id = recette.id_type_cuisson INNER JOIN theme_plat ON theme_plat.id = recette.id_theme_plat",
   (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});


// Route to get search recipes
app.get("/api/search/:searchTerm", (req, res) => {
  const searchTerm = req.params.searchTerm; // Récupérer la valeur de searchTerm à partir des paramètres de la requête

  // Utilisez LIKE avec des jokers % pour effectuer une recherche partielle
  db.query(
    "SELECT recette.*, type_plat.libelle AS type_plat, type_plat.icon AS icon, type_cuisson.libelle AS cuisson, theme_plat.libelle AS theme_plat FROM recette INNER JOIN type_plat ON type_plat.id = recette.id_type_plat INNER JOIN type_cuisson ON type_cuisson.id = recette.id_type_cuisson INNER JOIN theme_plat ON theme_plat.id = recette.id_theme_plat WHERE recette.libelle LIKE ?",
    `%${searchTerm}%`, 
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: "Une erreur est survenue lors de la recherche." });
        return;
      }
      res.send(result);
    }
  );
});



// Route to get random recipes
app.get("/api/getrandomrecipes", (req, res) => {
  db.query("SELECT recette.*, type_plat.libelle AS type_plat, type_plat.icon AS icon, type_cuisson.libelle AS cuisson, theme_plat.libelle AS theme_plat FROM recette INNER JOIN type_plat ON type_plat.id = recette.id_type_plat INNER JOIN type_cuisson ON type_cuisson.id = recette.id_type_cuisson INNER JOIN theme_plat ON theme_plat.id = recette.id_theme_plat ORDER BY RAND() LIMIT 3;",
   (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get top 5 recipes by likes
app.get("/api/gettoprecipes", (req, res) => {
  db.query(
    "SELECT recette.*, type_plat.libelle AS type_plat, type_plat.icon AS icon, type_cuisson.libelle AS cuisson, theme_plat.libelle AS theme_plat " +
    "FROM recette " +
    "INNER JOIN type_plat ON type_plat.id = recette.id_type_plat " +
    "INNER JOIN type_cuisson ON type_cuisson.id = recette.id_type_cuisson " +
    "INNER JOIN theme_plat ON theme_plat.id = recette.id_theme_plat " +
    "ORDER BY recette.likes DESC " + // Tri par likes décroissants
    "LIMIT 6;", // Limite le résultat à 5 recettes
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: "Erreur lors de la récupération des recettes" });
      } else {
        res.json(result);
      }
    }
  );
});



// Route to get recipes by user
app.get("/api/getmyrecipes/:userId", (req, res) => {
  const userId = req.params.userId;
  db.query("SELECT * FROM recette WHERE id_user = ?", userId, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get recipes by categories
app.get("/api/getrecipesbycategorie/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT * FROM recette WHERE id_type_plat = ?",
    id,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});

// Route to get all categories
app.get("/api/getcategories", (req, res) => {
  db.query("SELECT * FROM type_plat", (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get categorie's name
app.get("/api/getcategorie/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT libelle FROM type_plat WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get recipes by theme
app.get("/api/getrecipesbytheme/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT * FROM recette WHERE id_theme_plat = ?",
    id,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});

// Route to get all themes
app.get("/api/getthemes", (req, res) => {
  db.query("SELECT * FROM theme_plat", (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get all cooking ways
app.get("/api/getcooking", (req, res) => {
  db.query("SELECT * FROM type_cuisson", (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get all ingredients
app.get("/api/getingredients", (req, res) => {
  db.query(
    "SELECT * FROM ingredient ORDER BY ingredient.libelle ASC",
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});

// Route to get theme's name
app.get("/api/gettheme/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT libelle FROM theme_plat WHERE id = ?", id, (err, result) => {
    if (err) {
      console.log(err);
    }
    res.send(result);
  });
});

// Route to get recipe's details
app.get("/api/getrecipe/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT recette.*, type_plat.libelle AS type_plat, type_plat.icon AS icon, type_cuisson.libelle AS cuisson, theme_plat.libelle AS theme_plat FROM recette INNER JOIN type_plat ON type_plat.id = recette.id_type_plat INNER JOIN type_cuisson ON type_cuisson.id = recette.id_type_cuisson INNER JOIN theme_plat ON theme_plat.id = recette.id_theme_plat WHERE recette.id = ?",
    id,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});

// Route to get recipe's ingredients
app.get("/api/getingredientsbyrecipe/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT ingredient.libelle AS ingredient, ingredient.icon AS icon, recette_ingredient.id AS no_ingredient, recette_ingredient.id_ingredient AS id_ingredient, recette_ingredient.quantite AS quantite, recette_ingredient.unite AS unite FROM recette_ingredient INNER JOIN ingredient ON ingredient.id = recette_ingredient.id_ingredient WHERE recette_ingredient.id_recette = ?",
    id,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});

// Route to get recipe's steps
app.get("/api/getstepsbyrecipe/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "SELECT recette_etape.id AS idEtape, recette_etape.libelle AS numeroEtape, recette_etape.commentaire AS commentaireEtape, recette_etape.photo AS photoEtape FROM recette_etape INNER JOIN recette ON recette.id = recette_etape.id_recette WHERE recette.id = ? ORDER BY numeroEtape ASC",
    id,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      res.send(result);
    }
  );
});


// Route to like a recipe
app.post("/api/like/:id", (req, res) => {
  const id = req.params.id;
  db.query(
    "UPDATE recette SET likes = likes + 1 WHERE id = ?",
    id,
    (err, result) => {
      if (err) {
        console.log(err);
      }
      console.log(result);
    }
  );
});

// Route to create recipe
app.post("/api/createrecipe", (req, res) => {
  const id = uuid.v4();
  const libelle = req.body.libelle;
  const nombre_portion = req.body.nombre_portion;
  const type_portion = req.body.type_portion;
  const temps_preparation = req.body.temps_preparation;
  const temps_cuisson = req.body.temps_cuisson;
  const temps_repos = req.body.temps_repos;
  const difficulte = req.body.difficulte;
  const cout = req.body.cout;
  const commentaire = req.body.commentaire;
  const photo = req.body.photo;
  const id_type_plat = req.body.id_type_plat;
  const id_type_cuisson = req.body.id_type_cuisson;
  const id_theme_plat = req.body.id_theme_plat;
  const userId = req.body.userId;

  console.log("Données reçues :", req.body);
  const sqlQuery =
    "INSERT INTO recette (id, id_user, libelle, nombre_portion, type_portion, temps_preparation, temps_cuisson, temps_repos, difficulte, cout, commentaire, photo, id_type_plat, id_type_cuisson, id_theme_plat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(
    sqlQuery,
    [
      id,
      userId,
      libelle,
      nombre_portion,
      type_portion,
      temps_preparation,
      temps_cuisson,
      temps_repos,
      difficulte,
      cout,
      commentaire,
      photo,
      id_type_plat,
      id_type_cuisson,
      id_theme_plat,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la création.");
      } else {
        // const id = result.insertId; // Obtenez l'ID généré pour la nouvelle recette
        console.log("Nouvelle recette créée avec l'ID:", id);
        res.status(200).json({ id: id }); // Renvoyez l'ID dans la réponse
      }
    }
  );
});

// Route to add ingredient
app.post("/api/addingredient", (req, res) => {
  const id = uuid.v4();
  const libelle = req.body.libelle;
  const icon = req.body.icon;

  console.log("Données reçues :", req.body);
  const sqlQuery =
    "INSERT INTO ingredient (id, libelle, icon) VALUES (?, ?, ?)";
  db.query(sqlQuery, [id, libelle, icon], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erreur lors de la création.");
    } else {
      console.log("Nouvel ingrédient ajouté");
      res.status(200).send("Création réussie.");
    }
  });
});

// Route to create recette_ingredient
app.post("/api/createingredient", (req, res) => {
  const id = uuid.v4();
  const id_ingredient = req.body.id_ingredient;
  const quantite = req.body.quantite;
  const unite = req.body.unite;
  const id_recette = req.body.id_recette;

  console.log("Données reçues :", req.body);
  const sqlQuery =
    "INSERT INTO recette_ingredient (id, id_ingredient, quantite, unite, id_recette) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sqlQuery,
    [id, id_ingredient, quantite, unite, id_recette],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la création.");
      } else {
        console.log("Nouvel ingrédient créé");
        res.status(200).send("Création réussie.");
      }
    }
  );
});

// Route to create recette_etape
app.post("/api/createsteps", (req, res) => {
  const id = uuid.v4();
  const libelle = req.body.libelle;
  const commentaire = req.body.commentaire;
  const photo = req.body.photo;
  const id_recette = req.body.id_recette;

  console.log("Données reçues :", req.body);
  const sqlQuery =
    "INSERT INTO recette_etape (id, libelle, commentaire, photo, id_recette) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sqlQuery,
    [id, libelle, commentaire, photo, id_recette],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la création.");
      } else {
        console.log("Nouvelle étape créée");
        res.status(200).send("Création réussie.");
      }
    }
  );
});

// Route to create recipe
app.post("/api/modifyrecipe/:id", (req, res) => {
  const id = req.params.id;
  const libelle = req.body.libelle;
  const nombre_portion = req.body.nombre_portion;
  const type_portion = req.body.type_portion;
  const temps_preparation = req.body.temps_preparation;
  const temps_cuisson = req.body.temps_cuisson;
  const temps_repos = req.body.temps_repos;
  const difficulte = req.body.difficulte;
  const cout = req.body.cout;
  const commentaire = req.body.commentaire;
  const photo = req.body.photo;
  const id_type_plat = req.body.id_type_plat;
  const id_type_cuisson = req.body.id_type_cuisson;
  const id_theme_plat = req.body.id_theme_plat;
  const userId = req.body.userId;

  const sqlQuery =
    "UPDATE recette SET libelle=?, nombre_portion=?, type_portion=?, temps_preparation=?, temps_cuisson=?, temps_repos=?, difficulte=?, cout=?, commentaire=?, photo=?, id_type_plat=?, id_type_cuisson=?, id_theme_plat=? WHERE id=?";

  db.query(
    sqlQuery,
    [
      libelle,
      nombre_portion,
      type_portion,
      temps_preparation,
      temps_cuisson,
      temps_repos,
      difficulte,
      cout,
      commentaire,
      photo,
      id_type_plat,
      id_type_cuisson,
      id_theme_plat,
      id,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la mise à jour.");
      } else {
        console.log("Recette mise à jour avec l'ID:", id);
        res.status(200).json({ id: id }); // Renvoyez l'ID dans la réponse
      }
    }
  );
});

// Route to delete recette_ingredient
app.delete("/api/deleteingredient/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM recette_ingredient WHERE id= ?", id, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      console.log("étape supprimée");
        res.status(204).send("Suppression réussie.");
    }
  });
});

// Route to delete recette_etape
app.delete("/api/deleteetape/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM recette_etape WHERE id= ?", id, (err, result) => {
    if (err) {
      console.log(err);
    }
  });
});


// Route pour mettre à jour les numéros d'étape
app.post("/api/updatestepnumbers", (req, res) => {
  const { stepNumbers } = req.body;
  console.log("stepNumbers", stepNumbers)
  // Utilisez une boucle pour mettre à jour chaque étape avec le nouveau numéro
  stepNumbers.forEach(({ id, newNumber }) => {
    
    db.query("UPDATE recette_etape SET libelle = ? WHERE id = ?", [newNumber, id], (err, result) => {
      if (err) {
        console.log(err);
      }
    });
  });


  // Route pour mettre à jour les numéros d'étape
app.post("/api/modifystep/:id", (req, res) => {
  const id = req.params.id;
  const commentaire = req.body.commentaire;
    db.query("UPDATE recette_etape SET commentaire = ? WHERE id = ?", [commentaire, id], (err, result) => {
      if (err) {
        console.log(err);
      }
    });
  });

  // Répondre avec un message de succès
  res.json({ message: "Les numéros d'étape ont été mis à jour avec succès." });
});



// Route pour supprimer et mettre à jour une étape
app.post("/api/deleteAndUpdateStep/:id", (req, res) => {
  const id = req.params.id;
  const { updatedStepNumbers } = req.body;

  // Supprimer l'étape en utilisant l'ID
  db.query("DELETE FROM recette_etape WHERE id = ?", id, (err, deleteResult) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: "Erreur lors de la suppression de l'étape." });
      return;
    }

    // Utilisez une boucle pour mettre à jour chaque étape avec le nouveau numéro
    updatedStepNumbers.forEach(({ id: stepId, newNumber }) => {
      db.query(
        "UPDATE recette_etape SET libelle = ? WHERE id = ?",
        [newNumber, stepId],
        (err, updateResult) => {
          if (err) {
            console.log(err);
            res.status(500).json({ error: "Erreur lors de la mise à jour des numéros d'étape." });
            return;
          }
        }
      );
    });

    res.status(200).json({ message: "Suppression et mise à jour réussies." });
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
